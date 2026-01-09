// src/services/socketService.ts
// Socket.IO client for real-time updates from the server

import { io, Socket } from "socket.io-client";
import { getApiBase } from "../utils/apiBase";
import { invalidateCollisionCacheTiles } from "../map/utils/pathfinding";

let socket: Socket | null = null;
let isConnecting = false;

interface CollisionInvalidatePayload {
  files: Array<{ floor: number; fileX: number; fileY: number }>;
  version: number;
  timestamp: string;
}

interface CollisionVersionPayload {
  version: number;
  timestamp: string;
}

/**
 * Initialize the Socket.IO connection
 */
export function initializeSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  if (isConnecting) {
    return socket!;
  }

  isConnecting = true;

  const apiBase = getApiBase();
  const socketUrl = apiBase || window.location.origin;

  console.log(`%c🔌 Connecting to Socket.IO at ${socketUrl}`, "color: cyan");

  socket = io(socketUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on("connect", () => {
    console.log(`%c✅ Socket.IO connected (id: ${socket?.id})`, "color: green");
    isConnecting = false;

    // Request current collision cache version on connect
    socket?.emit("collision:version:request");
  });

  socket.on("disconnect", (reason) => {
    console.log(`%c❌ Socket.IO disconnected: ${reason}`, "color: orange");
  });

  socket.on("connect_error", (error) => {
    console.error("Socket.IO connection error:", error);
    isConnecting = false;
  });

  // Listen for collision invalidation events from other clients
  socket.on("collision:invalidate", async (payload: CollisionInvalidatePayload) => {
    console.log(
      `%c📡 Received collision:invalidate for ${payload.files.length} files (v${payload.version})`,
      "color: yellow"
    );

    // Invalidate the specified tiles and re-fetch them
    try {
      await invalidateCollisionCacheTiles(payload.files, true);
      console.log(
        `%c✅ Successfully updated ${payload.files.length} collision tiles`,
        "color: green"
      );
    } catch (err) {
      console.error("Failed to handle collision:invalidate:", err);
    }
  });

  // Listen for collision version updates (full cache version, not specific files)
  socket.on("collision:version", (payload: CollisionVersionPayload) => {
    console.log(
      `%c📊 Collision cache version: ${payload.version} (updated: ${payload.timestamp})`,
      "color: cyan"
    );
  });

  return socket;
}

/**
 * Get the current socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect the socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnecting = false;
    console.log("%c🔌 Socket.IO disconnected manually", "color: orange");
  }
}

/**
 * Request current collision cache version from server
 */
export function requestCollisionVersion(): void {
  if (socket?.connected) {
    socket.emit("collision:version:request");
  }
}
