import React from "react";
import { RichText, parseTableSyntax } from "../../utils/RichText";

/**
 * Renders a {{table|...}} markup string using the exact same
 * styling as the TableCreator preview tab.
 */
export const TablePreview: React.FC<{
  markup: string;
  onStepClick?: (step: number) => void;
}> = ({ markup, onStepClick }) => {
  // Extract inner content from {{table|...}}
  const match = markup.match(/^\{\{table\|((?:[^{}]|\{[^{}]*\})*)\}\}$/);
  if (!match) return null;

  const table = parseTableSyntax(match[1]);
  if (!table) return null;

  return (
    <div
      style={{
        overflowX: "auto",
        background: "#0a0a0f",
        padding: 12,
        borderRadius: 4,
        border: "1px solid #374151",
      }}
    >
      <table style={{ borderCollapse: "collapse", border: `1px solid ${table.style.borderColor}`, width: "100%" }}>
        <thead>
          <tr style={{ background: table.style.headerBgColor }}>
            {table.headers.map((h, i) => (
              <th
                key={i}
                style={{
                  padding: "8px 12px",
                  color: table.style.headerTextColor,
                  border: `1px solid ${table.style.borderColor}`,
                  textAlign: "left",
                  fontWeight: "bold",
                }}
              >
                <RichText onStepClick={onStepClick}>{h}</RichText>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr
              key={ri}
              style={{
                background:
                  ri % 2 === 0 ? table.style.evenRowBgColor : table.style.oddRowBgColor,
              }}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: "8px 12px",
                    color: "#e5e7eb",
                    border: `1px solid ${table.style.borderColor}`,
                    verticalAlign: "top",
                  }}
                >
                  <RichText onStepClick={onStepClick}>{cell}</RichText>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
