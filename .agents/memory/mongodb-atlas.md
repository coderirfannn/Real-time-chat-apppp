---
name: MongoDB Atlas connectivity
description: Project-specific note about diagnosing Atlas connections from Replit workflows.
---

MongoDB Atlas connectivity must be validated from the running API workflow, not only by checking that `MONGODB_URI` exists. A configured URI can still fail during TLS negotiation and surface as `ReplicaSetNoPrimary` when the Replit runtime is not permitted by Atlas network access rules or the URI credentials/settings are invalid.

**Why:** The app can start its HTTP and Socket.IO listeners while the database connection is unavailable, so a green workflow does not prove that authenticated CRUD routes can persist data.

**How to apply:** When auth or message routes fail after a secret is added, inspect API workflow logs for the first MongoDB connection error and verify Atlas network access and connection string configuration before changing application code.