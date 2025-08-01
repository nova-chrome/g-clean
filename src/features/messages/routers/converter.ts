import { gmail_v1 } from "googleapis";
import { Message } from "~/lib/server/db/schema";
import { decodeBase64 } from "~/util/decode-base64";
import { extractEmailAddress } from "../util/extract-email-address";

export function convertGmailMessageToMessage(
  userId: string,
  message: gmail_v1.Schema$Message
): Omit<Message, "senderId"> {
  const headers = message?.payload?.headers || [];

  const fromHeader = headers.find(
    (header) => header.name?.toLowerCase() === "from"
  )?.value;

  const subjectHeader = headers.find(
    (header) => header.name?.toLowerCase() === "subject"
  )?.value;

  const dateHeader = headers.find(
    (header) => header.name?.toLowerCase() === "date"
  )?.value;

  const toHeader = headers.find(
    (header) => header.name?.toLowerCase() === "to"
  )?.value;

  // Convert date string to Date object
  let parsedDate: Date | null = null;
  if (dateHeader) {
    const date = new Date(dateHeader);
    // Check if the date is valid
    if (!isNaN(date.getTime())) {
      parsedDate = date;
    }
  }

  return {
    body: convertGmailMessageBodyOrPartsToBody(
      message.payload?.body,
      message.payload?.parts
    ),
    date: parsedDate,
    id: message.id || "",
    labelIds: message.labelIds || [],
    from: extractEmailAddress(fromHeader || ""),
    snippet: message.snippet || "",
    subject: subjectHeader || "",
    to: toHeader || "",
    userId,
  };
}

function convertGmailMessageBodyOrPartsToBody(
  body?: gmail_v1.Schema$MessagePartBody,
  parts?: gmail_v1.Schema$MessagePart[]
) {
  if (body?.data) {
    return decodeBase64(body.data);
  }

  return convertGmailMessagePartsToBody(parts);
}

function convertGmailMessagePartsToBody(
  parts: gmail_v1.Schema$MessagePart[] | undefined
) {
  if (!parts) return "";

  return parts
    .map((part) => (part.body?.data ? decodeBase64(part.body.data) : null))
    .filter(Boolean)
    .join("\n");
}
