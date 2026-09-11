import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    password: { type: String, required: true, select: false },
    avatar: { type: String, default: null },
    bio: { type: String, default: null, maxlength: 280 },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },
  },
  { timestamps: true },
);

const conversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessage: { type: String, default: null },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true },
);
conversationSchema.index({ participants: 1, updatedAt: -1 });

const messageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 4000 },
    messageType: { type: String, enum: ["text", "emoji"], default: "text" },
    status: {
      type: String,
      enum: ["sending", "sent", "delivered", "read"],
      default: "sent",
      index: true,
    },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    replyTo: { type: Schema.Types.ObjectId, ref: "Message", default: null },
  },
  { timestamps: true },
);
messageSchema.index({ conversationId: 1, createdAt: -1 });

export type UserDocument = InferSchemaType<typeof userSchema>;
export const User = model("User", userSchema);
export const Conversation = model("Conversation", conversationSchema);
export const Message = model("Message", messageSchema);