import { InferSelectModel, relations } from "drizzle-orm";
import { pgTableCreator, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { customAlphabet } from "nanoid";

export const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789");

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
  senderId: varchar("sender_id", { length: 191 }),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(senders, {
    fields: [messages.senderId],
    references: [senders.id],
  }),
}));

export type Sender = InferSelectModel<typeof senders>;
export const senders = pgTable("senders", {
  id: varchar("id", { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text("user_id").notNull(),
  orgName: text("org_name").notNull(),
});

export const sendersRelations = relations(senders, ({ many }) => ({
  messages: many(messages),
}));

// -----===[ Non-DB ]===-----
export type Label = {
  label: string;
  value: string;
};
