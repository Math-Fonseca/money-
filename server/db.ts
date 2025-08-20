import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as authSchema from "@shared/auth-schema";

// Configure neon for WebSocket
neonConfig.webSocketConstructor = ws;

// Check if we have a database URL
if (!process.env.DATABASE_URL) {
  console.warn(
    "DATABASE_URL not set. Using in-memory storage only.",
  );
}

// Create connection pool only if DATABASE_URL is available
export const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

// Create database instance with all schemas only if pool exists
export const db = pool 
  ? drizzle({ client: pool, schema: { ...schema, ...authSchema } })
  : null;

// Export individual schema modules for convenience
export { schema, authSchema };