import type { Server as SocketServer } from "socket.io";

// Module-level singleton shared across the custom server and API routes
// (all run in the same Node.js process with a shared module cache)
let _io: SocketServer | null = null;

export function setSocketIO(io: SocketServer): void {
  _io = io;
}

export function getSocketIO(): SocketServer | null {
  return _io;
}
