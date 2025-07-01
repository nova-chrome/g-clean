import { sql } from "drizzle-orm";
import { pgTableCreator, text, uuid } from "drizzle-orm/pg-core";

export const pgTable = pgTableCreator((name) => `gc_${name}`);

export const messages = pgTable("messages", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  body: text("body").notNull(),
  date: text("date"),
  from: text("from").notNull(),
  labelIds: text("label_ids").array(),
  snippet: text("snippet"),
  subject: text("subject"),
  to: text("to"),
});
