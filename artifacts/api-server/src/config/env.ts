export const env = {
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET ?? process.env.SESSION_SECRET,
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV ?? "development",
};

export function requireJwtSecret() {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET or SESSION_SECRET must be configured");
  }
  return env.jwtSecret;
}