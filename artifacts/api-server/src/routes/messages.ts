import { Router, type IRouter } from "express";
import { CreateMessageBody, ListMessagesQueryParams } from "@workspace/api-zod";
import { connectMongo } from "../db/mongo";
import { Conversation, Message, User } from "../models/chat";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { getRealtimeServer } from "../services/realtime";
import { serializeMessage } from "../utils/serializers";

const router: IRouter = Router();

async function getAuthorizedConversation(conversationId: string, userId: string) {
  return Conversation.findOne({ _id: conversationId, participants: userId });
}

router.get(
  "/conversations/:conversationId/messages",
  requireAuth,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await connectMongo();
      const conversation = await getAuthorizedConversation(String(req.params.conversationId), req.userId!);
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found." });
        return;
      }
      const { before, limit } = ListMessagesQueryParams.parse(req.query);
      const pageSize = limit ?? 40;
      const messages = await Message.find({
        conversationId: conversation._id,
        ...(before ? { createdAt: { $lt: new Date(before) } } : {}),
      })
        .sort({ createdAt: -1 })
        .limit(pageSize);
      res.json({
        messages: messages.reverse().map(serializeMessage),
        hasMore: messages.length === pageSize,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post("/messages", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await connectMongo();
    const input = CreateMessageBody.parse(req.body);
    const conversation = await getAuthorizedConversation(input.conversationId, req.userId!);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }
    const receiverId = conversation.participants.find((id) => String(id) !== req.userId);
    const receiver = await User.findById(receiverId);
    const delivered = Boolean(receiver?.isOnline);
    const message = await Message.create({
      conversationId: conversation._id,
      sender: req.userId,
      receiver: receiverId,
      content: input.content.trim(),
      messageType: /^[\p{Extended_Pictographic}\s]+$/u.test(input.content) ? "emoji" : "text",
      status: delivered ? "delivered" : "sent",
      deliveredAt: delivered ? new Date() : null,
      replyTo: input.replyTo ?? null,
    });
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: message.content,
      lastMessageAt: message.createdAt,
    });
    const serialized = serializeMessage(message);
    getRealtimeServer()?.to(`user:${String(receiverId)}`).emit("new_message", serialized);
    if (delivered) {
      getRealtimeServer()?.to(`user:${req.userId}`).emit("message_delivered", {
        messageId: String(message._id),
        deliveredAt: message.deliveredAt?.toISOString(),
      });
    }
    res.status(201).json(serialized);
  } catch (error) {
    next(error);
  }
});

router.delete("/messages/:messageId", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await connectMongo();
    const deleted = await Message.findOneAndDelete({
      _id: req.params.messageId,
      sender: req.userId,
    });
    if (!deleted) {
      res.status(404).json({ error: "Message not found or not owned by you." });
      return;
    }
    getRealtimeServer()?.to(`user:${deleted.receiver}`).emit("message_deleted", {
      messageId: String(deleted._id),
    });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.post(
  "/conversations/:conversationId/read",
  requireAuth,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await connectMongo();
      const conversation = await getAuthorizedConversation(String(req.params.conversationId), req.userId!);
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found." });
        return;
      }
      const messages = await Message.find({
        conversationId: conversation._id,
        receiver: req.userId,
        status: { $in: ["sent", "delivered"] },
      });
      const readAt = new Date();
      await Message.updateMany(
        { _id: { $in: messages.map((message) => message._id) } },
        { $set: { status: "read", readAt } },
      );
      for (const message of messages) {
        getRealtimeServer()?.to(`user:${message.sender}`).emit("message_read", {
          messageId: String(message._id),
          readAt: readAt.toISOString(),
        });
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

export default router;