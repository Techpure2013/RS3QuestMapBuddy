import React from "react";
import ReactDOM from "react-dom/client"; // Note the '/client' for React 18
import App from "./../Application/app";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
const root = ReactDOM.createRoot(rootElement);

root.render(<App />);
