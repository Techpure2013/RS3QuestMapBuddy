import React, { useState, useEffect, useRef, useCallback } from "react";

const TABLE_COLORS_STORAGE_KEY = "table-creator-favorite-colors";

interface TableCell {
  content: string;
  bgColor?: string;
  textColor?: string;
  colspan?: number;
  rowspan?: number;
}

interface TableData {
  headers: TableCell[];
  rows: TableCell[][];
  borderColor: string;
  headerBgColor: string;
  headerTextColor: string;
  evenRowBgColor: string;
  oddRowBgColor: string;
}

interface FavoriteColorSet {
  name: string;
  borderColor: string;
  headerBgColor: string;
  headerTextColor: string;
  evenRowBgColor: string;
  oddRowBgColor: string;
}

function loadFavoriteColors(): FavoriteColorSet[] {
  try {
    const stored = localStorage.getItem(TABLE_COLORS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavoriteColors(colors: FavoriteColorSet[]) {
  localStorage.setItem(TABLE_COLORS_STORAGE_KEY, JSON.stringify(colors));
}

// Default presets - RS3 Brown and RS3 Blue for consistency
const DEFAULT_PRESETS: FavoriteColorSet[] = [
  {
    name: "RS3 Brown",
    borderColor: "#5a4a3a",
    headerBgColor: "#2a2318",
    headerTextColor: "#c4a87a",
    evenRowBgColor: "#1e1a14",
    oddRowBgColor: "#2a2318",
  },
  {
    name: "RS3 Blue",
    borderColor: "#1e40af",
    headerBgColor: "#1e3a8a",
    headerTextColor: "#93c5fd",
    evenRowBgColor: "#172554",
    oddRowBgColor: "#1e3a5f",
  },
];

const DEFAULT_TABLE: TableData = {
  headers: [{ content: "Header 1" }, { content: "Header 2" }, { content: "Header 3" }],
  rows: [
    [{ content: "Row 1, Col 1" }, { content: "Row 1, Col 2" }, { content: "Row 1, Col 3" }],
    [{ content: "Row 2, Col 1" }, { content: "Row 2, Col 2" }, { content: "Row 2, Col 3" }],
  ],
  borderColor: "#5a4a3a",
  headerBgColor: "#2a2318",
  headerTextColor: "#c4a87a",
  evenRowBgColor: "#1e1a14",
  oddRowBgColor: "#2a2318",
};

// Clean wiki markup from cell content, leaving only readable text
function cleanWikiContent(text: string): string {
  return text
    // [[File:Name.png|30px]] or [[File:Name.png]] → strip entirely
    .replace(/\[\[File:[^\]]+\]\]/gi, '')
    // [[Category:...]] → strip entirely
    .replace(/\[\[Category:[^\]]+\]\]/gi, '')
    // [[Link|Display text]] → Display text
    .replace(/\[\[([^\]]*?\|)([^\]]*?)\]\]/g, '$2')
    // [[Simple link]] → Simple link
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    // {{Template|params}} → strip
    .replace(/\{\{[^}]*\}\}/g, '')
    // <br />, <br>, <br/> → space
    .replace(/<br\s*\/?>/gi, ' ')
    // Other HTML tags → strip
    .replace(/<[^>]+>/g, '')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse wiki cell attributes (style, colspan, rowspan, bgcolor) from a cell string
// Splits on the first | that is NOT inside [[ ]] or {{ }} brackets,
// but only if the part before it looks like HTML attributes.
function parseCellAttributes(cellText: string): TableCell {
  const trimmed = cellText.trim();

  // Find the first | that's NOT inside [[ ]] or {{ }}
  let bracketDepth = 0;
  let braceDepth = 0;
  let splitIndex = -1;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    const next = trimmed[i + 1];

    if (ch === '[' && next === '[') { bracketDepth++; i++; continue; }
    if (ch === ']' && next === ']') { bracketDepth = Math.max(0, bracketDepth - 1); i++; continue; }
    if (ch === '{' && next === '{') { braceDepth++; i++; continue; }
    if (ch === '}' && next === '}') { braceDepth = Math.max(0, braceDepth - 1); i++; continue; }

    if (ch === '|' && bracketDepth === 0 && braceDepth === 0) {
      splitIndex = i;
      break;
    }
  }

  if (splitIndex === -1) {
    // No attribute separator found, whole thing is content
    return { content: cleanWikiContent(trimmed) };
  }

  const attrPart = trimmed.substring(0, splitIndex).trim();
  const contentPart = trimmed.substring(splitIndex + 1).trim();

  // Verify attrPart looks like HTML attributes (not wiki content)
  const hasAttributes = /(?:style|class|colspan|rowspan|bgcolor|width|align|valign|scope|id|data-)\s*=/i.test(attrPart);

  if (!hasAttributes) {
    // The | was part of content (like in [[File:...|size]]), not an attribute separator
    return { content: cleanWikiContent(trimmed) };
  }

  // Parse attributes
  const result: TableCell = {
    content: cleanWikiContent(contentPart),
  };

  // Parse colspan
  const colspanMatch = attrPart.match(/colspan\s*=\s*"?(\d+)"?/i);
  if (colspanMatch) result.colspan = parseInt(colspanMatch[1]);

  // Parse rowspan
  const rowspanMatch = attrPart.match(/rowspan\s*=\s*"?(\d+)"?/i);
  if (rowspanMatch) result.rowspan = parseInt(rowspanMatch[1]);

  // Parse background color from style or bgcolor attribute
  const bgStyleMatch = attrPart.match(/background(?:-color)?\s*:\s*([^;"]+)/i);
  const bgAttrMatch = attrPart.match(/bgcolor\s*=\s*"?([^";}\s]+)"?/i);
  if (bgStyleMatch) result.bgColor = bgStyleMatch[1].trim();
  else if (bgAttrMatch) result.bgColor = bgAttrMatch[1].trim();

  // Parse text color from style
  const colorMatch = attrPart.match(/(?:^|;)\s*color\s*:\s*([^;"]+)/i);
  if (colorMatch) result.textColor = colorMatch[1].trim();

  return result;
}

// Flatten multi-row headers (e.g. "Colour" rowspan=2 + "Value" colspan=4, then Circle/Triangle/Square/Pentagon)
// into a single header row by resolving spans and picking the bottom-most cell for each column.
function flattenHeaderRows(headerRows: TableCell[][]): TableCell[] {
  if (headerRows.length === 0) return [];
  if (headerRows.length === 1) return headerRows[0];

  // Calculate total columns from the row with the most (accounting for colspan)
  let totalCols = 0;
  for (const row of headerRows) {
    let cols = 0;
    for (const cell of row) cols += (cell.colspan || 1);
    totalCols = Math.max(totalCols, cols);
  }

  // Build grid: occupied[r][c] = the TableCell occupying that position, or null
  const occupied: (TableCell | null)[][] = headerRows.map(() =>
    new Array(totalCols).fill(null)
  );

  for (let r = 0; r < headerRows.length; r++) {
    let c = 0;
    for (const cell of headerRows[r]) {
      // Find next unoccupied column
      while (c < totalCols && occupied[r][c] !== null) c++;
      if (c >= totalCols) break;

      const cs = cell.colspan || 1;
      const rs = cell.rowspan || 1;

      // Mark all positions this cell occupies
      for (let dr = 0; dr < rs && (r + dr) < headerRows.length; dr++) {
        for (let dc = 0; dc < cs && (c + dc) < totalCols; dc++) {
          occupied[r + dr][c + dc] = cell;
        }
      }
      c += cs;
    }
  }

  // For each column, pick the bottom-most cell that isn't a parent span
  // (prefer the most specific sub-header over a spanning parent)
  const result: TableCell[] = [];
  for (let c = 0; c < totalCols; c++) {
    let best: TableCell | null = null;
    for (let r = headerRows.length - 1; r >= 0; r--) {
      if (occupied[r][c]) {
        best = occupied[r][c];
        break;
      }
    }
    result.push(best
      ? { content: best.content, bgColor: best.bgColor, textColor: best.textColor }
      : { content: '' }
    );
  }
  return result;
}

// Pre-process tab-separated text: merge lines that are continuations of multi-line cells.
// Skips title lines (zero-tab lines before a header row).
// Keeps standalone numeric rows (like "10" in a grid where trailing empty cells have no tabs).
function mergeMultiLineCells(lines: string[]): string[] {
  if (lines.length <= 1) return lines;

  const tabCounts = lines.map(l => (l.match(/\t/g) || []).length);
  const maxTabs = Math.max(...tabCounts);
  if (maxTabs === 0) return lines; // not tab-separated

  const merged: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (tabCounts[i] === 0) {
      const content = lines[i].trim();

      // Skip empty lines
      if (!content) continue;

      // Content is just a number → standalone row (e.g. row "10" in a grid)
      if (/^\d+$/.test(content)) {
        merged.push(lines[i]);
        continue;
      }

      // First zero-tab line (before any tabbed lines added): check if next line
      // looks like a header row. If yes, this is a title — skip it.
      // If no, this is a multi-line cell start — merge forward.
      if (merged.length === 0 && i + 1 < lines.length && tabCounts[i + 1] > 0) {
        const nextCells = lines[i + 1].split(/\t/).map(c => c.trim());
        const looksLikeHeader = nextCells.every(c => c.length < 30 && !/^\d+(\.\d+)?$/.test(c))
          && nextCells.filter(c => c !== '').length > nextCells.length / 2;
        if (looksLikeHeader) {
          continue; // title before header — skip
        }
        // Not a header next — merge forward into it (multi-line cell)
        lines[i + 1] = lines[i] + ' ' + lines[i + 1];
        continue;
      }

      // Merge backward into previous line
      if (merged.length > 0) {
        merged[merged.length - 1] += ' ' + lines[i];
        continue;
      }
    }
    merged.push(lines[i]);
  }
  return merged;
}

// Parse wiki table format (MediaWiki style)
function parseWikiTable(text: string): TableData | null {
  const lines = text.trim().split("\n");
  const headerRows: TableCell[][] = [];
  let currentHeaderRow: TableCell[] = [];
  const headers: TableCell[] = [];
  const rows: TableCell[][] = [];
  let currentRow: TableCell[] = [];
  let inTable = false;
  let pastHeaders = false; // once we see data cells, no more header rows

  for (const line of lines) {
    const trimmed = line.trim();

    // Table start
    if (trimmed.startsWith("{|")) {
      inTable = true;
      continue;
    }

    // Table end
    if (trimmed === "|}") {
      if (currentHeaderRow.length > 0) headerRows.push(currentHeaderRow);
      if (currentRow.length > 0) rows.push(currentRow);
      break;
    }

    if (!inTable) continue;

    // Row separator
    if (trimmed.startsWith("|-")) {
      if (currentHeaderRow.length > 0) {
        headerRows.push(currentHeaderRow);
        currentHeaderRow = [];
      }
      if (currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
      }
      continue;
    }

    // Header cells (!)
    if (trimmed.startsWith("!") && !pastHeaders) {
      const cellContent = trimmed.substring(1).split("!!");
      for (const content of cellContent) {
        currentHeaderRow.push(parseCellAttributes(content));
      }
      continue;
    }

    // Regular cells (|)
    if (trimmed.startsWith("|") && !trimmed.startsWith("|-") && !trimmed.startsWith("{|") && !trimmed.startsWith("|}")) {
      pastHeaders = true;
      if (currentHeaderRow.length > 0) {
        headerRows.push(currentHeaderRow);
        currentHeaderRow = [];
      }
      const cellContent = trimmed.substring(1).split("||");
      for (const content of cellContent) {
        currentRow.push(parseCellAttributes(content));
      }
    }
  }

  // Flush remaining header row
  if (currentHeaderRow.length > 0) headerRows.push(currentHeaderRow);

  // Flatten multi-row headers into a single row
  if (headerRows.length > 0) {
    headers.push(...flattenHeaderRows(headerRows));
  }

  // Handle simple tab/space-delimited tables (like copying from rendered wiki)
  if (headers.length === 0 && rows.length === 0) {
    let simpleLines = text.trim().split("\n").filter(l => l.trim());

    // Pre-process: merge multi-line cells in tab-separated content
    simpleLines = mergeMultiLineCells(simpleLines);

    if (simpleLines.length >= 1) {
      // Detect if tab-separated
      const isTabSeparated = simpleLines.some(l => l.includes('\t'));
      const splitPattern = isTabSeparated ? /\t/ : /  +/;

      // Split all lines into cells
      const allCells = simpleLines.map(line => {
        const cells = line.split(splitPattern).map(c => c.trim());
        if (!isTabSeparated) {
          while (cells.length > 0 && cells[0] === '') cells.shift();
        }
        return cells;
      });

      // Fix wiki grid alignment: if data rows have one more cell than the header
      // (row-number column present in data but missing from header), prepend an
      // empty cell to the header so columns align correctly.
      if (isTabSeparated && allCells.length > 2) {
        const headerLen = allCells[0].length;
        const maxDataLen = Math.max(...allCells.slice(1).map(r => r.length));
        if (maxDataLen === headerLen + 1) {
          const firstCellsAreNumbers = allCells.slice(1).filter(r => r[0]?.trim()).every(r => /^\d+$/.test(r[0].trim()));
          if (firstCellsAreNumbers) {
            allCells[0] = ['', ...allCells[0]];
          }
        }
      }

      // Determine column count from the WIDEST line (not just the first)
      const colCount = Math.max(...allCells.map(c => c.length));

      if (colCount > 1) {
        // Find partial header rows: initial lines with fewer columns than colCount
        let dataStartIdx = 0;
        while (dataStartIdx < allCells.length && allCells[dataStartIdx].length < colCount) {
          dataStartIdx++;
        }

        // Check if the first full-width line looks like a header row
        if (dataStartIdx < allCells.length) {
          const firstFull = allCells[dataStartIdx];
          const isHeaderLine = firstFull.every(c => c.length < 50 && !/^\d+(\.\d+)?$/.test(c))
            && firstFull.filter(c => c !== '').length > firstFull.length / 2;
          if (isHeaderLine) {
            dataStartIdx++; // include as a header line
          }
        }

        // Build headers from header lines
        const headerLines = allCells.slice(0, dataStartIdx);
        if (headerLines.length === 0) {
          // No headers detected, auto-generate
          for (let i = 0; i < colCount; i++) headers.push({ content: `Column ${i + 1}` });
        } else if (headerLines.length === 1) {
          // Single header line
          for (let i = 0; i < colCount; i++) {
            headers.push({ content: headerLines[0][i] || '' });
          }
        } else {
          // Multiple partial header lines (e.g. "Colour | Value" then "Circle | Triangle | Square | Pentagon")
          // Take the widest partial row and prepend cells from earlier rows to fill the gap
          const widest = [...headerLines.reduce((a, b) => a.length >= b.length ? a : b)];
          const needed = colCount - widest.length;
          const combined: string[] = [];
          if (needed > 0) {
            combined.push(...headerLines[0].slice(0, needed));
            // Remaining cells from the first row are group labels for the sub-headers
            const groupLabels = headerLines[0].slice(needed);
            if (groupLabels.length > 0) {
              const cellsPerGroup = Math.ceil(widest.length / groupLabels.length);
              for (let j = 0; j < widest.length; j++) {
                const groupIdx = Math.min(Math.floor(j / cellsPerGroup), groupLabels.length - 1);
                const label = groupLabels[groupIdx];
                if (label && widest[j] && label !== widest[j]) {
                  widest[j] = `${label}: ${widest[j]}`;
                }
              }
            }
          }
          combined.push(...widest);
          while (combined.length < colCount) combined.push('');
          for (let i = 0; i < colCount; i++) {
            headers.push({ content: combined[i] });
          }
        }

        // Build data rows
        for (let i = dataStartIdx; i < allCells.length; i++) {
          const rowCells = allCells[i].slice(0, colCount);
          while (rowCells.length < colCount) rowCells.push('');
          rows.push(rowCells.map(c => ({ content: c })));
        }
      }
    }
  }

  if (headers.length === 0 && rows.length === 0) {
    return null;
  }

  // If no headers but have rows, use first row as headers
  if (headers.length === 0 && rows.length > 0) {
    const firstRow = rows.shift();
    if (firstRow) {
      headers.push(...firstRow);
    }
  }

  return {
    headers,
    rows,
    borderColor: "#5a4a3a",
    headerBgColor: "#2a2318",
    headerTextColor: "#c4a87a",
    evenRowBgColor: "#1e1a14",
    oddRowBgColor: "#2a2318",
  };
}

// Generate markdown table syntax for inline use
function generateMarkdownTable(table: TableData): string {
  const colCount = table.headers.length;

  let md = "{{table|";
  md += `border:${table.borderColor}|`;
  md += `hbg:${table.headerBgColor}|`;
  md += `htx:${table.headerTextColor}|`;
  md += `ebg:${table.evenRowBgColor}|`;
  md += `obg:${table.oddRowBgColor}|`;

  // Headers
  md += table.headers.map(h => h.content.replace(/\|/g, "\\|")).join("|") + "||";

  // Rows
  for (const row of table.rows) {
    const cells = row.slice(0, colCount);
    while (cells.length < colCount) {
      cells.push({ content: "" });
    }
    md += cells.map(c => c.content.replace(/\|/g, "\\|")).join("|") + "||";
  }

  md = md.slice(0, -2); // Remove trailing ||
  md += "}}";

  return md;
}

interface TableCreatorProps {
  onInsert: (markup: string) => void;
  onClose: () => void;
}

export const TableCreator: React.FC<TableCreatorProps> = ({ onInsert, onClose }) => {
  const [table, setTable] = useState<TableData>(DEFAULT_TABLE);
  const [pasteText, setPasteText] = useState("");
  const [activeTab, setActiveTab] = useState<"paste" | "edit" | "style">("paste");
  const [exportQuality, setExportQuality] = useState(0.95);
  const [exportScale, setExportScale] = useState(2); // 2x for high DPI
  const [favoriteColors, setFavoriteColors] = useState<FavoriteColorSet[]>([]);
  const [newPresetName, setNewPresetName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Load favorite colors on mount
  useEffect(() => {
    setFavoriteColors(loadFavoriteColors());
  }, []);

  // Close on click outside (with confirmation)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (window.confirm("Close Table Creator? Any unsaved changes will be lost.")) {
          onClose();
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleParse = () => {
    const parsed = parseWikiTable(pasteText);
    if (parsed) {
      setTable(parsed);
      setActiveTab("edit");
    } else {
      alert("Could not parse table. Try copying the table content directly from the wiki.");
    }
  };

  const updateHeader = (index: number, content: string) => {
    const newHeaders = [...table.headers];
    newHeaders[index] = { ...newHeaders[index], content };
    setTable({ ...table, headers: newHeaders });
  };

  const updateCell = (rowIndex: number, colIndex: number, content: string) => {
    const newRows = [...table.rows];
    newRows[rowIndex] = [...newRows[rowIndex]];
    newRows[rowIndex][colIndex] = { ...newRows[rowIndex][colIndex], content };
    setTable({ ...table, rows: newRows });
  };

  const addColumn = () => {
    const newHeaders = [...table.headers, { content: `Header ${table.headers.length + 1}` }];
    const newRows = table.rows.map(row => [...row, { content: "" }]);
    setTable({ ...table, headers: newHeaders, rows: newRows });
  };

  const removeColumn = (index: number) => {
    if (table.headers.length <= 1) return;
    const newHeaders = table.headers.filter((_, i) => i !== index);
    const newRows = table.rows.map(row => row.filter((_, i) => i !== index));
    setTable({ ...table, headers: newHeaders, rows: newRows });
  };

  const addRow = () => {
    const newRow = table.headers.map(() => ({ content: "" }));
    setTable({ ...table, rows: [...table.rows, newRow] });
  };

  const removeRow = (index: number) => {
    const newRows = table.rows.filter((_, i) => i !== index);
    setTable({ ...table, rows: newRows });
  };

  const handleInsertInline = () => {
    const markup = generateMarkdownTable(table);
    onInsert(markup);
  };

  const applyColorPreset = (preset: FavoriteColorSet) => {
    setTable({
      ...table,
      borderColor: preset.borderColor,
      headerBgColor: preset.headerBgColor,
      headerTextColor: preset.headerTextColor,
      evenRowBgColor: preset.evenRowBgColor,
      oddRowBgColor: preset.oddRowBgColor,
    });
  };

  const saveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: FavoriteColorSet = {
      name: newPresetName.trim(),
      borderColor: table.borderColor,
      headerBgColor: table.headerBgColor,
      headerTextColor: table.headerTextColor,
      evenRowBgColor: table.evenRowBgColor,
      oddRowBgColor: table.oddRowBgColor,
    };
    const updated = [...favoriteColors, newPreset];
    setFavoriteColors(updated);
    saveFavoriteColors(updated);
    setNewPresetName("");
  };

  const deletePreset = (name: string) => {
    const updated = favoriteColors.filter(c => c.name !== name);
    setFavoriteColors(updated);
    saveFavoriteColors(updated);
  };

  const renderTableToCanvas = useCallback((): HTMLCanvasElement | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const MIN_SIZE = 800; // Minimum 800x800 for quality
    const scale = exportScale;
    const baseCellPadding = 12;
    const baseFontSize = 14;
    const baseHeaderFontSize = 15;

    // First pass: calculate natural size
    ctx.font = `${baseFontSize * scale}px "IBM Plex Sans", "Segoe UI", sans-serif`;

    let naturalColWidths: number[] = [];
    for (let c = 0; c < table.headers.length; c++) {
      let maxWidth = ctx.measureText(table.headers[c].content).width;
      for (const row of table.rows) {
        if (row[c]) {
          const width = ctx.measureText(row[c].content).width;
          if (width > maxWidth) maxWidth = width;
        }
      }
      naturalColWidths.push(maxWidth + baseCellPadding * 2 * scale);
    }

    const naturalRowHeight = baseFontSize * scale + baseCellPadding * 2 * scale;
    const naturalHeaderHeight = baseHeaderFontSize * scale + baseCellPadding * 2 * scale;
    const naturalWidth = naturalColWidths.reduce((a, b) => a + b, 0) + scale;
    const naturalHeight = naturalHeaderHeight + table.rows.length * naturalRowHeight + scale;

    // Calculate scale factor to meet minimum size
    const widthScale = naturalWidth < MIN_SIZE ? MIN_SIZE / naturalWidth : 1;
    const heightScale = naturalHeight < MIN_SIZE ? MIN_SIZE / naturalHeight : 1;
    const sizeScale = Math.max(widthScale, heightScale);

    const cellPadding = baseCellPadding * scale * sizeScale;
    const fontSize = baseFontSize * scale * sizeScale;
    const headerFontSize = baseHeaderFontSize * scale * sizeScale;
    const borderWidth = scale * sizeScale;

    // Recalculate with new scale
    ctx.font = `${fontSize}px "IBM Plex Sans", "Segoe UI", sans-serif`;

    const colWidths: number[] = [];
    for (let c = 0; c < table.headers.length; c++) {
      let maxWidth = ctx.measureText(table.headers[c].content).width;
      for (const row of table.rows) {
        if (row[c]) {
          const width = ctx.measureText(row[c].content).width;
          if (width > maxWidth) maxWidth = width;
        }
      }
      colWidths.push(maxWidth + cellPadding * 2);
    }

    const rowHeight = fontSize + cellPadding * 2;
    const headerHeight = headerFontSize + cellPadding * 2;
    const totalWidth = Math.max(MIN_SIZE, colWidths.reduce((a, b) => a + b, 0) + borderWidth);
    const totalHeight = Math.max(MIN_SIZE, headerHeight + table.rows.length * rowHeight + borderWidth);

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Background
    ctx.fillStyle = table.evenRowBgColor;
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Draw header
    ctx.fillStyle = table.headerBgColor;
    ctx.fillRect(0, 0, totalWidth, headerHeight);

    ctx.fillStyle = table.headerTextColor;
    ctx.font = `bold ${headerFontSize}px "IBM Plex Sans", "Segoe UI", sans-serif`;
    ctx.textBaseline = "middle";

    let x = 0;
    for (let c = 0; c < table.headers.length; c++) {
      ctx.fillText(table.headers[c].content, x + cellPadding, headerHeight / 2);
      x += colWidths[c];
    }

    // Draw rows
    ctx.font = `${fontSize}px "IBM Plex Sans", "Segoe UI", sans-serif`;
    let y = headerHeight;

    for (let r = 0; r < table.rows.length; r++) {
      // Alternating row colors
      ctx.fillStyle = r % 2 === 0 ? table.evenRowBgColor : table.oddRowBgColor;
      ctx.fillRect(0, y, totalWidth, rowHeight);

      ctx.fillStyle = "#e5e7eb";
      x = 0;
      for (let c = 0; c < table.headers.length; c++) {
        const cell = table.rows[r][c];
        if (cell) {
          ctx.fillText(cell.content, x + cellPadding, y + rowHeight / 2);
        }
        x += colWidths[c];
      }
      y += rowHeight;
    }

    // Draw borders
    ctx.strokeStyle = table.borderColor;
    ctx.lineWidth = borderWidth;

    // Vertical lines
    x = 0;
    for (let c = 0; c <= table.headers.length; c++) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, totalHeight);
      ctx.stroke();
      if (c < table.headers.length) x += colWidths[c];
    }

    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(totalWidth, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(totalWidth, headerHeight);
    ctx.stroke();

    y = headerHeight;
    for (let r = 0; r <= table.rows.length; r++) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(totalWidth, y);
      ctx.stroke();
      y += rowHeight;
    }

    return canvas;
  }, [table, exportScale]);

  const handleExportWebp = async () => {
    const canvas = renderTableToCanvas();
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/webp", exportQuality);
      });

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `table-${Date.now()}.webp`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to export table:", error);
      alert("Failed to export table as image.");
    }
  };

  const buttonStyle: React.CSSProperties = {
    padding: "6px 12px",
    fontSize: "0.75rem",
    background: "#374151",
    border: "1px solid #4b5563",
    borderRadius: 4,
    color: "#e5e7eb",
    cursor: "pointer",
  };

  const inputStyle: React.CSSProperties = {
    padding: "6px 8px",
    background: "#111827",
    border: "1px solid #374151",
    borderRadius: 4,
    color: "#e5e7eb",
    fontSize: "0.8rem",
    width: "100%",
  };

  const colorInputStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    padding: 0,
    border: "2px solid #4b5563",
    borderRadius: 4,
    cursor: "pointer",
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "#1f2937",
        border: "1px solid #374151",
        borderRadius: 8,
        padding: 16,
        zIndex: 1300,
        width: "90vw",
        maxWidth: 800,
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: "#fbbf24", fontSize: "1rem" }}>Table Creator</h3>
        <button onClick={onClose} style={{ ...buttonStyle, background: "#7f1d1d", border: "1px solid #991b1b" }}>
          ✕ Close
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {(["paste", "edit", "style"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...buttonStyle,
              background: activeTab === tab ? "#3b82f6" : "#374151",
              textTransform: "capitalize",
            }}
          >
            {tab === "paste" ? "Paste Wiki Table" : tab === "edit" ? "Edit Cells" : "Style Colors"}
          </button>
        ))}
      </div>

      {/* Paste Tab */}
      {activeTab === "paste" && (
        <div>
          <p style={{ color: "#9ca3af", fontSize: "0.75rem", marginBottom: 8 }}>
            Paste wiki table content (MediaWiki format or tab-separated from rendered table):
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`{| class="wikitable"
! Header 1 !! Header 2
|-
| Cell 1 || Cell 2
|}

Or paste tab-separated content from a rendered wiki table.`}
            style={{
              ...inputStyle,
              height: 200,
              fontFamily: "monospace",
              resize: "vertical",
            }}
          />
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button onClick={handleParse} style={{ ...buttonStyle, background: "#22c55e", border: "1px solid #16a34a" }}>
              Parse Table
            </button>
            <button
              onClick={() => {
                setTable(DEFAULT_TABLE);
                setActiveTab("edit");
              }}
              style={buttonStyle}
            >
              Start Fresh
            </button>
          </div>
        </div>
      )}

      {/* Edit Tab */}
      {activeTab === "edit" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={addColumn} style={buttonStyle}>+ Add Column</button>
            <button onClick={addRow} style={buttonStyle}>+ Add Row</button>
          </div>

          <div style={{ overflowX: "auto", marginBottom: 12 }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  {table.headers.map((header, i) => (
                    <th key={i} style={{ padding: 4 }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input
                          value={header.content}
                          onChange={(e) => updateHeader(i, e.target.value)}
                          style={{ ...inputStyle, fontWeight: "bold" }}
                        />
                        <button
                          onClick={() => removeColumn(i)}
                          style={{ ...buttonStyle, padding: "4px 8px", background: "#7f1d1d" }}
                          title="Remove column"
                        >
                          ✕
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: 4 }}>
                        <input
                          value={cell.content}
                          onChange={(e) => updateCell(ri, ci, e.target.value)}
                          style={inputStyle}
                        />
                      </td>
                    ))}
                    <td style={{ padding: 4 }}>
                      <button
                        onClick={() => removeRow(ri)}
                        style={{ ...buttonStyle, padding: "4px 8px", background: "#7f1d1d" }}
                        title="Remove row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Style Tab */}
      {activeTab === "style" && (
        <div>
          {/* Color Presets */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: "0.75rem", color: "#fbbf24", marginBottom: 8, fontWeight: "bold" }}>
              Color Presets
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {DEFAULT_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyColorPreset(preset)}
                  style={{
                    ...buttonStyle,
                    padding: "4px 10px",
                    background: `linear-gradient(135deg, ${preset.headerBgColor}, ${preset.evenRowBgColor})`,
                    border: `2px solid ${preset.headerTextColor}`,
                    color: preset.headerTextColor,
                    fontSize: "0.7rem",
                  }}
                  title={`Apply ${preset.name} preset`}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* User Favorites */}
            {favoriteColors.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginBottom: 4 }}>Your Saved Presets</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {favoriteColors.map((preset) => (
                    <div key={preset.name} style={{ position: "relative" }}>
                      <button
                        onClick={() => applyColorPreset(preset)}
                        style={{
                          ...buttonStyle,
                          padding: "4px 10px",
                          background: `linear-gradient(135deg, ${preset.headerBgColor}, ${preset.evenRowBgColor})`,
                          border: `2px solid ${preset.headerTextColor}`,
                          color: preset.headerTextColor,
                          fontSize: "0.7rem",
                        }}
                        title={`Apply ${preset.name} preset`}
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={() => deletePreset(preset.name)}
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          width: 16,
                          height: 16,
                          background: "#7f1d1d",
                          border: "1px solid #991b1b",
                          borderRadius: "50%",
                          color: "#fca5a5",
                          fontSize: "10px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                        title="Delete preset"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save Current as Preset */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Preset name..."
                style={{ ...inputStyle, width: 150 }}
              />
              <button
                onClick={saveCurrentAsPreset}
                style={{ ...buttonStyle, background: "#065f46", border: "1px solid #047857" }}
                disabled={!newPresetName.trim()}
              >
                Save Current
              </button>
            </div>
          </div>

          {/* Color Pickers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: "0.7rem", color: "#9ca3af", display: "block", marginBottom: 4 }}>
                Header Background
              </label>
              <input
                type="color"
                value={table.headerBgColor}
                onChange={(e) => setTable({ ...table, headerBgColor: e.target.value })}
                style={colorInputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", color: "#9ca3af", display: "block", marginBottom: 4 }}>
                Header Text
              </label>
              <input
                type="color"
                value={table.headerTextColor}
                onChange={(e) => setTable({ ...table, headerTextColor: e.target.value })}
                style={colorInputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", color: "#9ca3af", display: "block", marginBottom: 4 }}>
                Even Row Background
              </label>
              <input
                type="color"
                value={table.evenRowBgColor}
                onChange={(e) => setTable({ ...table, evenRowBgColor: e.target.value })}
                style={colorInputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", color: "#9ca3af", display: "block", marginBottom: 4 }}>
                Odd Row Background
              </label>
              <input
                type="color"
                value={table.oddRowBgColor}
                onChange={(e) => setTable({ ...table, oddRowBgColor: e.target.value })}
                style={colorInputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", color: "#9ca3af", display: "block", marginBottom: 4 }}>
                Border Color
              </label>
              <input
                type="color"
                value={table.borderColor}
                onChange={(e) => setTable({ ...table, borderColor: e.target.value })}
                style={colorInputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", color: "#9ca3af", display: "block", marginBottom: 4 }}>
                Export Scale (higher = better quality)
              </label>
              <select
                value={exportScale}
                onChange={(e) => setExportScale(Number(e.target.value))}
                style={{ ...inputStyle, width: "auto" }}
              >
                <option value={1}>1x (Standard)</option>
                <option value={2}>2x (High DPI)</option>
                <option value={3}>3x (Ultra HD)</option>
                <option value={4}>4x (Maximum)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      <div style={{ marginTop: 16 }}>
        <h4 style={{ color: "#9ca3af", fontSize: "0.8rem", marginBottom: 8 }}>Preview</h4>
        <div
          ref={previewRef}
          style={{
            overflowX: "auto",
            background: "#0a0a0f",
            padding: 12,
            borderRadius: 4,
            border: "1px solid #374151",
          }}
        >
          <table style={{ borderCollapse: "collapse", border: `1px solid ${table.borderColor}` }}>
            <thead>
              <tr style={{ background: table.headerBgColor }}>
                {table.headers.map((h, i) => (
                  <th
                    key={i}
                    colSpan={h.colspan}
                    rowSpan={h.rowspan}
                    style={{
                      padding: "8px 12px",
                      color: h.textColor || table.headerTextColor,
                      background: h.bgColor || undefined,
                      border: `1px solid ${table.borderColor}`,
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    {h.content}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? table.evenRowBgColor : table.oddRowBgColor }}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      colSpan={cell.colspan}
                      rowSpan={cell.rowspan}
                      style={{
                        padding: "8px 12px",
                        color: cell.textColor || "#e5e7eb",
                        background: cell.bgColor || undefined,
                        border: `1px solid ${table.borderColor}`,
                      }}
                    >
                      {cell.content}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Actions */}
      <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button onClick={onClose} style={buttonStyle}>
          Cancel
        </button>
        <button
          onClick={handleInsertInline}
          style={{ ...buttonStyle, background: "#22c55e", border: "1px solid #16a34a" }}
          title="Insert table markup into text (for small tables)"
        >
          Insert Inline Table
        </button>
        <button
          onClick={handleExportWebp}
          style={{ ...buttonStyle, background: "#3b82f6", border: "1px solid #2563eb" }}
          title="Export as high-quality .webp image (for large tables)"
        >
          Export as .webp
        </button>
      </div>
    </div>
  );
};

export default TableCreator;
