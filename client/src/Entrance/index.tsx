import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import App from "./../Application/app";
import { io, Socket } from "socket.io-client";
import { SocketProvider } from "./Entrance Components/SocketProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <SocketProvider>
    <App />
  </SocketProvider>
);
