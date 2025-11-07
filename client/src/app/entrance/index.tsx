import React from "react";
import ReactDOM from "react-dom/client";
import App from "./../app";
import { io, Socket } from "socket.io-client";
//import { SocketProvider } from "./Entrance Components/SocketProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />
);
