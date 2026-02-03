import React, { useState, useEffect, useRef, useCallback } from "react";

const TABLE_COLORS_STORAGE_KEY = "table-creator-favorite-colors";

interface TableCell {
  content: string;
  bgColor?: string;
  textColor?: string;
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

// Parse wiki table format (MediaWiki style)
function parseWikiTable(text: string): TableData | null {
  const lines = text.trim().split("\n");
  const headers: TableCell[] = [];
  const rows: TableCell[][] = [];
  let currentRow: TableCell[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Table start
    if (trimmed.startsWith("{|")) {
      inTable = true;
      continue;
    }

    // Table end
    if (trimmed === "|}") {
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      break;
    }

    if (!inTable) continue;

    // Header row marker
    if (trimmed.startsWith("|-")) {
      if (currentRow.length > 0) {
        if (headers.length === 0 && rows.length === 0) {
          // First row becomes headers if we haven't set them
        } else {
          rows.push(currentRow);
        }
        currentRow = [];
      }
      continue;
    }

    // Header cells (!)
    if (trimmed.startsWith("!")) {
      const cellContent = trimmed.substring(1).split("!!").map(c => c.trim());
      for (const content of cellContent) {
        // Strip any wiki formatting like colspan, style, etc.
        const cleanContent = content.replace(/^[^|]*\|/, "").trim();
        headers.push({ content: cleanContent || content });
      }
      continue;
    }

    // Regular cells (|)
    if (trimmed.startsWith("|") && !trimmed.startsWith("|-") && !trimmed.startsWith("{|") && !trimmed.startsWith("|}")) {
      const cellContent = trimmed.substring(1).split("||").map(c => c.trim());
      for (const content of cellContent) {
        // Strip any wiki formatting
        const cleanContent = content.replace(/^[^|]*\|/, "").trim();
        currentRow.push({ content: cleanContent || content });
      }
    }
  }

  // Handle simple pipe-delimited tables (like copying from rendered wiki)
  if (headers.length === 0 && rows.length === 0) {
    const simpleLines = text.trim().split("\n").filter(l => l.trim());
    if (simpleLines.length >= 1) {
      // First line as headers
      const headerCells = simpleLines[0].split(/\t|  +/).filter(c => c.trim());
      if (headerCells.length > 1) {
        for (const h of headerCells) {
          headers.push({ content: h.trim() });
        }
        // Rest as rows
        for (let i = 1; i < simpleLines.length; i++) {
          const rowCells = simpleLines[i].split(/\t|  +/).filter(c => c.trim());
          if (rowCells.length > 0) {
            rows.push(rowCells.map(c => ({ content: c.trim() })));
          }
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

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
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
                    style={{
                      padding: "8px 12px",
                      color: table.headerTextColor,
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
                      style={{
                        padding: "8px 12px",
                        color: "#e5e7eb",
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
