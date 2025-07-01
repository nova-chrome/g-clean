CREATE TABLE "gc_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"body" text NOT NULL,
	"date" text,
	"from" text NOT NULL,
	"label_ids" text[],
	"snippet" text,
	"subject" text,
	"to" text
);
