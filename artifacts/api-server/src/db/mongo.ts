import mongoose from "mongoose";
import { env } from "../config/env";
import { logger } from "../lib/logger";

let connectionPromise: Promise<typeof mongoose> | undefined;

export async function connectMongo() {
  if (!env.mongoUri) {
    logger.warn("MONGODB_URI is not configured; data routes will be unavailable");
    return undefined;
  }

  if (mongoose.connection.readyState === 1) return mongoose;

  connectionPromise ??= mongoose
    .connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 })
    .then((connection) => {
      logger.info("MongoDB connected");
      return connection;
    })
    .catch((error) => {
      connectionPromise = undefined;
      logger.error({ err: error }, "MongoDB connection failed");
      throw error;
    });

  return connectionPromise;
}