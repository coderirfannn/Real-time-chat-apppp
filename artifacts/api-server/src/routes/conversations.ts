import { Router, type IRouter } from "express";
import { CreateConversationBody } from "@workspace/api-zod";
import { connectMongo } from "../db/mongo";
import { Conversation, Message, User } from "../models/chat";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { serializeUser } from "../utils/serializers";

const router: IRouter = Router();

async function serializeConversation(conversation: any, userId: string) {
  const participant = conversation.participants.find(
    (candidate: any) => String(candidate._id) !== userId,
  );
  const unreadCount = await Message.countDocuments({
    conversationId: conversation._id,
    receiver: userId,
    status: { $in: ["sent", "delivered"] },
  });
  return {
    id: String(conversation._id),
    participant: serializeUser(participant),
    lastMessage: conversation.lastMessage ?? null,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    unreadCount,
  };
}

router.get("/conversations", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await connectMongo();
    const conversations = await Conversation.find({ participants: req.userId })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate("participants");
    res.json(await Promise.all(conversations.map((conversation) => serializeConversation(conversation, req.userId!))));
  } catch (error) {
    next(error);
  }
});

router.post("/conversations", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await connectMongo();
    const { participantId } = CreateConversationBody.parse(req.body);
    if (participantId === req.userId) {
      res.status(400).json({ error: "You cannot start a conversation with yourself." });
      return;
    }
    const participant = await User.findById(participantId);
    if (!participant) {
      res.status(404).json({ error: "That user could not be found." });
      return;
    }
    let conversation: any = await Conversation.findOne({
      participants: { $all: [req.userId, participantId], $size: 2 },
    }).populate("participants");
    if (!conversation) {
      const created = await Conversation.create({ participants: [req.userId!, participantId] });
      conversation = await Conversation.findById(created._id).populate("participants");
    }
    res.status(201).json(await serializeConversation(conversation, req.userId!));
  } catch (error) {
    next(error);
  }
});

export default router;