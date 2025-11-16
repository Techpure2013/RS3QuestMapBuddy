// src/main/index.tsx (or your entry file)
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./../app";
import { EditorStore } from "./../../state/editorStore";

async function bootstrap(): Promise<void> {
  await EditorStore.initialize();
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("Missing #root element");
  ReactDOM.createRoot(rootEl).render(<App />);
}

void bootstrap();
