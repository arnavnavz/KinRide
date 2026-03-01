import "dotenv/config";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketServer } from "socket.io";
import { decode } from "next-auth/jwt";
import { startBackgroundJobs } from "./src/lib/jobs";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const [key, ...rest] = pair.trim().split("=");
    if (key) cookies[key] = decodeURIComponent(rest.join("="));
  }
  return cookies;
}

interface SocketUser {
  id: string;
  role: string;
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketServer(server, {
    cors: { origin: "*" },
    path: "/api/socketio",
  });

  // Authenticate socket connections using NextAuth JWT
  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token =
        cookies["next-auth.session-token"] ||
        cookies["__Secure-next-auth.session-token"];

      if (!token) {
        return next(new Error("No session token"));
      }

      const secret = process.env.NEXTAUTH_SECRET;
      if (!secret) {
        return next(new Error("Server misconfigured"));
      }

      const decoded = await decode({ token, secret });
      if (!decoded?.id || !decoded?.role) {
        return next(new Error("Invalid token"));
      }

      (socket.data as { user: SocketUser }).user = {
        id: decoded.id as string,
        role: decoded.role as string,
      };
      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const user = (socket.data as { user: SocketUser }).user;

    socket.on("join:ride", (rideId: string) => {
      socket.join(`ride:${rideId}`);
    });

    socket.on("leave:ride", (rideId: string) => {
      socket.leave(`ride:${rideId}`);
    });

    // Only allow joining own user room
    socket.on("join:user", (userId: string) => {
      if (userId === user.id) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on("driver:location", (data: { rideId: string; lat: number; lng: number; heading?: number; speed?: number }) => {
      socket.to(`ride:${data.rideId}`).emit("driver:location", {
        lat: data.lat,
        lng: data.lng,
        heading: data.heading ?? null,
        speed: data.speed ?? null,
      });
    });

    socket.on("chat:message", (data: { rideId: string; message: unknown }) => {
      io.to(`ride:${data.rideId}`).emit("chat:message", data.message);
    });

    socket.on("ride:status", (data: { rideId: string; status: string; ride: unknown }) => {
      io.to(`ride:${data.rideId}`).emit("ride:status", data);
    });

    socket.on("ride:offer", (data: { driverId: string; offer: unknown }) => {
      io.to(`user:${data.driverId}`).emit("ride:offer", data.offer);
    });

    socket.on("ride:accepted", (data: { rideId: string; ride: unknown }) => {
      io.to(`ride:${data.rideId}`).emit("ride:accepted", data.ride);
    });

    socket.on("join:conversation", (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on("leave:conversation", (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on("dm:message", (data: { conversationId: string; message: unknown }) => {
      io.to(`conv:${data.conversationId}`).emit("dm:message", data.message);
    });
  });

  const port = parseInt(process.env.PORT || "3000", 10);
  server.listen(port, "0.0.0.0", () => {
    console.log(`> Kayu ready on http://localhost:${port}`);
    startBackgroundJobs();
  });
});
