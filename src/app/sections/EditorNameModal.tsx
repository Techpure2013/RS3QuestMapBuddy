// src/app/sections/EditorNameModal.tsx
import React, { useState, useEffect } from "react";

interface Props {
  initial?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

type Stage = "input" | "confirm1" | "confirm2" | "confirm3" | "storing";

export const EditorNameModal: React.FC<Props> = ({ initial, onConfirm, onCancel }) => {
  const [name, setName] = useState(initial ?? "");
  const [stage, setStage] = useState<Stage>("input");

  useEffect(() => {
    if (stage === "storing") {
      const t = setTimeout(() => onConfirm(name.trim()), 1500);
      return () => clearTimeout(t);
    }
  }, [stage, name, onConfirm]);

  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  };

  const box: React.CSSProperties = {
    background: "#1e1e1e",
    border: "1px solid #444",
    borderRadius: 8,
    padding: "24px 32px",
    minWidth: 340,
    maxWidth: 420,
    color: "#e0e0e0",
    fontFamily: "inherit",
    textAlign: "center",
  };

  const btnRow: React.CSSProperties = {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    marginTop: 16,
  };

  const btn: React.CSSProperties = {
    fontSize: "0.8rem",
    padding: "6px 18px",
    cursor: "pointer",
    border: "1px solid #555",
    borderRadius: 4,
    background: "#2a2a2a",
    color: "#e0e0e0",
  };

  const btnPrimary: React.CSSProperties = {
    ...btn,
    background: "#3a6",
    borderColor: "#3a6",
    color: "#fff",
  };

  if (stage === "storing") {
    return (
      <div style={overlay}>
        <div style={box}>
          <p style={{ fontSize: "1.1rem", margin: 0 }}>
            I am putting it into storage thanks
          </p>
        </div>
      </div>
    );
  }

  if (stage === "confirm1") {
    return (
      <div style={overlay}>
        <div style={box}>
          <p style={{ fontSize: "1rem", marginBottom: 4 }}>
            You entered: <strong>{name}</strong>
          </p>
          <p style={{ fontSize: "1.1rem" }}>Are you sure?</p>
          <div style={btnRow}>
            <button style={btnPrimary} onClick={() => setStage("confirm2")}>Yes</button>
            <button style={btn} onClick={() => setStage("input")}>No</button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "confirm2") {
    return (
      <div style={overlay}>
        <div style={box}>
          <p style={{ fontSize: "1rem", marginBottom: 4 }}>
            Name: <strong>{name}</strong>
          </p>
          <p style={{ fontSize: "1.1rem" }}>Are you REALLY sure that's your name?</p>
          <div style={btnRow}>
            <button style={btnPrimary} onClick={() => setStage("confirm3")}>Absolutely</button>
            <button style={btn} onClick={() => setStage("input")}>Let me change it</button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "confirm3") {
    return (
      <div style={overlay}>
        <div style={box}>
          <p style={{ fontSize: "1rem", marginBottom: 4 }}>
            Final name: <strong>{name}</strong>
          </p>
          <p style={{ fontSize: "1.1rem" }}>Last chance! Is this definitely you?</p>
          <div style={btnRow}>
            <button style={btnPrimary} onClick={() => setStage("storing")}>Yes, lock it in!</button>
            <button style={btn} onClick={() => setStage("input")}>No, go back</button>
          </div>
        </div>
      </div>
    );
  }

  // stage === "input"
  return (
    <div style={overlay}>
      <div style={box}>
        <p style={{ fontSize: "1.1rem", marginBottom: 12 }}>Enter your editor name:</p>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) setStage("confirm1");
          }}
          style={{
            width: "100%",
            padding: "8px 10px",
            fontSize: "0.95rem",
            background: "#2a2a2a",
            border: "1px solid #555",
            borderRadius: 4,
            color: "#e0e0e0",
            boxSizing: "border-box",
          }}
        />
        <div style={btnRow}>
          <button
            style={btnPrimary}
            disabled={!name.trim()}
            onClick={() => setStage("confirm1")}
          >
            OK
          </button>
          <button style={btn} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
