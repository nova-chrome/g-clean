import { InferSelectModel } from "drizzle-orm";
import { pgTableCreator, text, timestamp } from "drizzle-orm/pg-core";

export const pgTable = pgTableCreator((name) => `gc_${name}`);

export type Message = InferSelectModel<typeof messages>;
export const messages = pgTable("messages", {
  id: text("id").primaryKey(), // Gmail message IDs are text, not UUIDs
  userId: text("user_id").notNull(), // Clerk user ID
  body: text("body").notNull(),
  date: timestamp("date", { withTimezone: true }),
  from: text("from").notNull(),
  labelIds: text("label_ids").array(),
  snippet: text("snippet"),
  subject: text("subject"),
  to: text("to"),
});

// -----===[ Non-DB ]===-----
export type Label = {
  label: string;
  value: string;
};
