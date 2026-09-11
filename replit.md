# Realtime Chat

Relay is a responsive one-to-one messaging workspace with MongoDB-backed persistence, Socket.IO realtime updates, presence, and delivery/read tracking.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/realtime-chat run dev` — run the web client
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required secret: `MONGODB_URI`
- Optional secret: `JWT_SECRET` (the existing `SESSION_SECRET` is accepted as fallback)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: MongoDB Atlas + Mongoose
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/realtime-chat/src/App.tsx` — responsive chat UI and realtime client behavior
- `artifacts/realtime-chat/src/index.css` — Relay visual system and theme tokens
- `artifacts/api-server/src/routes/` — auth, users, conversations, and messages
- `artifacts/api-server/src/models/chat.ts` — Mongoose models and indexes
- `artifacts/api-server/src/services/realtime.ts` — Socket.IO auth, presence, delivery sync, and typing events
- `lib/api-spec/openapi.yaml` — REST contract source of truth

## Architecture decisions

- MongoDB Atlas is used because the product brief explicitly requires MongoDB and `MONGODB_URI`; no connection string is committed.
- REST mutations persist before Socket.IO broadcasts so MongoDB remains authoritative after reconnects.
- Presence tracks a set of socket IDs per user, avoiding false offline states when a second tab remains open.
- The frontend uses generated API hooks and realtime-triggered query invalidation rather than treating React state as durable message storage.

## Product

- Secure registration and login
- Searchable direct conversations
- Message pagination, replies, deletion, delivery/read states, and typing indicators
- Responsive mobile chat navigation and persisted appearance preference

## User preferences

- The attached build brief is the product source of truth: production-minded UX, no fake chat data, MongoDB-backed persistence, and Socket.IO as the primary realtime mechanism.

## Gotchas

- Artifact builds require workflow-provided `PORT` and `BASE_PATH`; use the managed workflow or provide both variables for a manual build.
- The API service must keep `/api/socket.io` in its routed paths or Socket.IO traffic will be dropped by the proxy.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
