import { gmail_v1 } from "googleapis";
import { decodeBase64 } from "~/util/decode-base64";
import { Message } from "../types";
import { extractEmailAddress } from "../util/extract-email-address";

export function convertGmailMessageToMessage(
  message: gmail_v1.Schema$Message
): Message {
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

  return {
    body: convertGmailMessageBodyOrPartsToBody(
      message.payload?.body,
      message.payload?.parts
    ),
    date: dateHeader || undefined,
    id: message.id || undefined,
    labelIds: message.labelIds || [],
    from: extractEmailAddress(fromHeader || ""),
    snippet: message.snippet || undefined,
    subject: subjectHeader || undefined,
    to: toHeader || undefined,
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
