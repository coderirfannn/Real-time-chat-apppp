import type { Types } from "mongoose";

type UserLike = {
  _id: Types.ObjectId | string;
  name: string;
  username: string;
  email: string;
  avatar?: string | null;
  bio?: string | null;
  isOnline?: boolean;
  lastSeen?: Date | null;
  createdAt?: Date;
};

export function serializeUser(user: UserLike) {
  return {
    id: String(user._id),
    name: user.name,
    username: user.username,
    email: user.email,
    avatar: user.avatar ?? null,
    bio: user.bio ?? null,
    isOnline: user.isOnline ?? false,
    lastSeen: user.lastSeen?.toISOString() ?? null,
    createdAt: (user.createdAt ?? new Date()).toISOString(),
  };
}

export function serializeMessage(message: any) {
  return {
    id: String(message._id),
    conversationId: String(message.conversationId),
    senderId: String(message.sender),
    receiverId: String(message.receiver),
    content: message.content,
    messageType: message.messageType,
    status: message.status,
    deliveredAt: message.deliveredAt?.toISOString() ?? null,
    readAt: message.readAt?.toISOString() ?? null,
    replyTo: message.replyTo ? String(message.replyTo) : null,
    createdAt: message.createdAt.toISOString(),
  };
}