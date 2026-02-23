"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io({
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    });
  }
  return globalSocket;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = getSocket();
    return () => {
      // Don't disconnect the global socket on unmount
    };
  }, []);

  const joinRide = useCallback((rideId: string) => {
    socketRef.current?.emit("join:ride", rideId);
  }, []);

  const leaveRide = useCallback((rideId: string) => {
    socketRef.current?.emit("leave:ride", rideId);
  }, []);

  const joinUser = useCallback((userId: string) => {
    socketRef.current?.emit("join:user", userId);
  }, []);

  const sendMessage = useCallback(
    (rideId: string, message: Record<string, unknown>) => {
      socketRef.current?.emit("chat:message", { rideId, message });
    },
    []
  );

  const emitRideStatus = useCallback(
    (rideId: string, status: string, ride: Record<string, unknown>) => {
      socketRef.current?.emit("ride:status", { rideId, status, ride });
    },
    []
  );

  const emitRideAccepted = useCallback(
    (rideId: string, ride: Record<string, unknown>) => {
      socketRef.current?.emit("ride:accepted", { rideId, ride });
    },
    []
  );

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit("join:conversation", conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit("leave:conversation", conversationId);
  }, []);

  const sendDM = useCallback(
    (conversationId: string, message: Record<string, unknown>) => {
      socketRef.current?.emit("dm:message", { conversationId, message });
    },
    []
  );

  const onEvent = useCallback(
    (event: string, handler: (...args: unknown[]) => void) => {
      socketRef.current?.on(event, handler);
      return () => {
        socketRef.current?.off(event, handler);
      };
    },
    []
  );

  return {
    socket: socketRef.current,
    joinRide,
    leaveRide,
    joinUser,
    sendMessage,
    emitRideStatus,
    emitRideAccepted,
    joinConversation,
    leaveConversation,
    sendDM,
    onEvent,
  };
}
