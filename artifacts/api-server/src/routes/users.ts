import { Router, type IRouter } from "express";
import { SearchUsersQueryParams, UpdateProfileBody } from "@workspace/api-zod";
import { connectMongo } from "../db/mongo";
import { User } from "../models/chat";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { serializeUser } from "../utils/serializers";

const router: IRouter = Router();

router.get("/users/search", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await connectMongo();
    const { q } = SearchUsersQueryParams.parse(req.query);
    const expression = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const users = await User.find({
      _id: { $ne: req.userId },
      $or: [{ username: expression }, { name: expression }, { email: expression }],
    })
      .sort({ isOnline: -1, name: 1 })
      .limit(20);
    res.json(users.map(serializeUser));
  } catch (error) {
    next(error);
  }
});

router.patch("/users/profile", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await connectMongo();
    const input = UpdateProfileBody.parse(req.body);
    const user = await User.findByIdAndUpdate(
      req.userId,
      { ...input, ...(input.username ? { username: input.username.toLowerCase() } : {}) },
      { new: true, runValidators: true },
    );
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    res.json(serializeUser(user));
  } catch (error) {
    next(error);
  }
});

export default router;