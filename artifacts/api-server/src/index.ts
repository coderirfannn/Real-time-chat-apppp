import app from "./app";
import { logger } from "./lib/logger";
import { createServer } from "node:http";
import { connectMongo } from "./db/mongo";
import { attachRealtimeServer } from "./services/realtime";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
attachRealtimeServer(server);

connectMongo().catch((error) => logger.error({ err: error }, "Continuing without MongoDB"));

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
