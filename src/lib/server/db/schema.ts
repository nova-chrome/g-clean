import { pgTableCreator, text } from "drizzle-orm/pg-core";

export const pgTable = pgTableCreator((name) => `gc_${name}`);

export const messages = pgTable("messages", {
  id: text("id").primaryKey(), // Gmail message IDs are text, not UUIDs
  userId: text("user_id").notNull(), // Clerk user ID
  body: text("body").notNull(),
  date: text("date"),
  from: text("from").notNull(),
  labelIds: text("label_ids").array(),
  snippet: text("snippet"),
  subject: text("subject"),
  to: text("to"),
});
