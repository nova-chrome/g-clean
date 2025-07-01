import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "~/env";

config({ path: ".env" });

export const db = drizzle(env.DATABASE_URL);
