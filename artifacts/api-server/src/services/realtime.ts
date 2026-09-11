import { Server as SocketServer, type Server, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env, requireJwtSecret } from "../config/env";
import { Message, User } from "../models/chat";
import { logger } from "../lib/logger";
import { readToken } from "../middleware/auth";

const activeSockets = new Map<string, Set<string>>();
let io: Server | undefined;

export function getRealtimeServer() {
  return io;
}

function emitPresence(userId: string, isOnline: boolean, lastSeen?: Date) {
  io?.emit(isOnline ? "user_online" : "user_offline", {
    userId,
    isOnline,
    lastSeen: lastSeen?.toISOString() ?? null,
  });
}

async function deliverPendingMessages(userId: string) {
  const pending = await Message.find({ receiver: userId, status: "sent" }).limit(100);
  if (!pending.length) return;
  const deliveredAt = new Date();
  await Message.updateMany(
    { _id: { $in: pending.map((message) => message._id) } },
    { $set: { status: "delivered", deliveredAt } },
  );
  for (const message of pending) {
    io?.to(`user:${String(message.sender)}`).emit("message_delivered", {
      messageId: String(message._id),
      deliveredAt: deliveredAt.toISOString(),
    });
  }
}

async function authenticateSocket(socket: Socket) {
  const token =
    (socket.handshake.auth?.token as string | undefined) ??
    (socket.handshake.headers.cookie
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("chat_token="))
      ?.slice("chat_token=".length));
  if (!token) return undefined;
  const payload = jwt.verify(token, requireJwtSecret()) as { userId?: string };
  return payload.userId;
}

export function attachRealtimeServer(server: import("node:http").Server) {
  io = new SocketServer(server, {
    path: "/api/socket.io",
    cors: { origin: env.clientUrl, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const userId = await authenticateSocket(socket);
      if (!userId) return next(new Error("Authentication required"));
      socket.data.userId = userId;
      next();
    } catch {
      next(new Error("Invalid session"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;
    const sockets = activeSockets.get(userId) ?? new Set<string>();
    sockets.add(socket.id);
    activeSockets.set(userId, sockets);
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: null });
    emitPresence(userId, true);
    socket.join(`user:${userId}`);
    await deliverPendingMessages(userId);

    socket.on("typing_start", ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit("typing_start", { userId, conversationId });
    });
    socket.on("typing_stop", ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit("typing_stop", { userId, conversationId });
    });
    socket.on("join_conversation", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });
    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });
    socket.on("disconnect", async () => {
      const current = activeSockets.get(userId);
      current?.delete(socket.id);
      if (current?.size) return;
      activeSockets.delete(userId);
      const lastSeen = new Date();
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
      emitPresence(userId, false, lastSeen);
    });
  });

  logger.info("Socket.IO realtime server attached");
  return io;
}