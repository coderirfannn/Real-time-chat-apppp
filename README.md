# Realtime Chat

Relay is a responsive one-to-one messaging application with secure sessions, MongoDB persistence, delivery/read states, presence, typing indicators, and a mobile-first chat workspace.

## Current capabilities

- Register, login, logout, session validation, and protected API routes
- HTTP-only cookie sessions backed by JWT
- Password hashing with bcrypt
- User search by name, username, or email
- Direct conversation creation and recent conversation ordering
- Text and emoji messages with reply metadata
- Server-authoritative `sent`, `delivered`, and `read` states
- Message deletion, pagination, and loading older messages
- Socket.IO presence, reconnection, typing events, delivery synchronization, and read receipts
- Multiple-socket presence tracking per user
- Responsive desktop/mobile navigation
- Light/dark appearance preference persisted in the browser
- Loading, empty, error, and offline states

## Stack

- React, Vite, Wouter, Tailwind CSS, TanStack Query
- Express, TypeScript, Socket.IO
- MongoDB Atlas through Mongoose
- JWT, bcryptjs, Helmet, CORS, express-rate-limit
- OpenAPI contract with generated React Query hooks and Zod schemas

## Architecture

The frontend is `artifacts/realtime-chat`. The shared API server is `artifacts/api-server` and owns the `/api` REST surface plus the `/api/socket.io` Socket.IO path.

MongoDB remains the source of truth. REST mutations persist first, then emit realtime events. The client invalidates the relevant query cache after events so refreshed views reconcile from the server instead of relying on local-only state.

Presence uses an in-memory `Map<userId, Set<socketId>>`. A user becomes offline only after their final active socket disconnects. The tracker is intentionally isolated in `src/services/realtime.ts` so it can be replaced by Redis when the API is horizontally scaled.

When a user connects, pending messages addressed to them are marked delivered and the sender receives `message_delivered`. Opening a conversation calls the read endpoint, which persists `readAt` and emits `message_read` to the original sender. A disconnected recipient leaves messages in `sent`.

## Environment variables

Copy `.env.example` into your local environment or add the values as Replit Secrets:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Recommended | JWT signing secret; `SESSION_SECRET` is accepted as a secure fallback |
| `CLIENT_URL` | No | Allowed Socket.IO client origin |
| `PORT` | No | API server port, supplied by the managed workflow |

Never commit real values.

## MongoDB Atlas setup

1. Create a MongoDB Atlas cluster.
2. Create a database user with access to the application database.
3. Add the Replit runtime egress address or an appropriate Atlas network rule.
4. Copy the `mongodb+srv://...` connection string into the `MONGODB_URI` Replit Secret.
5. Restart the API workflow.

The app creates the `User`, `Conversation`, and `Message` collections through Mongoose on first write. Indexes are declared on usernames, emails, participants, conversation timestamps, receivers, statuses, and message creation order.

## Run

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/realtime-chat run dev
```

The Replit-managed workflows are the preferred way to run both services because they provide `PORT`, `BASE_PATH`, and proxy routing.

## API surface

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/users/search?q=...`
- `PATCH /api/users/profile`
- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:conversationId/messages`
- `POST /api/messages`
- `DELETE /api/messages/:messageId`
- `POST /api/conversations/:conversationId/read`
- `GET /api/healthz`

The source of truth for request/response contracts is `lib/api-spec/openapi.yaml`. After changing it, run:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## Socket.IO events

Client-to-server:

- `join_conversation`
- `leave_conversation`
- `typing_start`
- `typing_stop`

Server-to-client:

- `new_message`
- `message_delivered`
- `message_read`
- `message_deleted`
- `user_online`
- `user_offline`

The server authenticates sockets using the same HTTP-only cookie session as REST requests and reconnects are treated as synchronization points.

## Security notes

- Passwords are never returned from MongoDB queries or API responses.
- Protected routes verify the cookie or bearer token server-side.
- Conversation membership is checked before reading, sending, deleting, or marking messages read.
- Helmet, CORS credentials, and rate limiting are enabled at the API boundary.
- Validation is generated from the OpenAPI contract and applied before persistence.
- Internal errors are logged server-side without exposing stack traces to clients.

## Known next steps

- Add object storage for image/file/voice messages.
- Move presence and Socket.IO fan-out to Redis for multi-instance deployment.
- Add automated functional coverage for two-user realtime and offline synchronization flows.