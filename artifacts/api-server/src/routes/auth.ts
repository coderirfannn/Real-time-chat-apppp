import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { LoginBody, LoginResponse, RegisterBody, RegisterResponse } from "@workspace/api-zod";
import { connectMongo } from "../db/mongo";
import { User } from "../models/chat";
import { requireAuth, signUserToken, type AuthenticatedRequest } from "../middleware/auth";
import { serializeUser } from "../utils/serializers";

const router: IRouter = Router();
const cookieOptions = {
  httpOnly: true,
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post("/auth/register", async (req, res, next) => {
  try {
    await connectMongo();
    const input = RegisterBody.parse(req.body);
    const existing = await User.findOne({
      $or: [{ email: input.email.toLowerCase() }, { username: input.username.toLowerCase() }],
    });
    if (existing) {
      res.status(400).json({ error: "That email or username is already in use." });
      return;
    }
    const password = await bcrypt.hash(input.password, 12);
    const user = await User.create({
      ...input,
      email: input.email.toLowerCase(),
      username: input.username.toLowerCase(),
      password,
    });
    const payload = RegisterResponse.parse({ user: serializeUser(user) });
    res.cookie("chat_token", signUserToken(String(user._id)), cookieOptions);
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    await connectMongo();
    const input = LoginBody.parse(req.body);
    const user = await User.findOne({ email: input.email.toLowerCase() }).select("+password");
    if (!user || !(await bcrypt.compare(input.password, user.password))) {
      res.status(401).json({ error: "Incorrect email or password." });
      return;
    }
    res.cookie("chat_token", signUserToken(String(user._id)), cookieOptions);
    res.json(LoginResponse.parse({ user: serializeUser(user) }));
  } catch (error) {
    next(error);
  }
});

router.post("/auth/logout", (_req, res) => {
  res.clearCookie("chat_token", cookieOptions);
  res.status(204).end();
});

router.get("/auth/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await connectMongo();
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(401).json({ error: "Your account could not be found." });
      return;
    }
    res.json(serializeUser(user));
  } catch (error) {
    next(error);
  }
});

export default router;