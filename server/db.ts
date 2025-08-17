import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as authSchema from "@shared/auth-schema";

// Configure neon for WebSocket
neonConfig.webSocketConstructor = ws;

// Check if we have a database URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create database instance with all schemas
const allSchemas = { ...schema, ...authSchema };
export const db = drizzle({ client: pool, schema: allSchemas });

// Export individual schema modules for convenience
export { schema, authSchema };