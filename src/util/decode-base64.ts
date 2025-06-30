export function decodeBase64(str: string) {
  const normalized = str.replace(/-/g, "+").replace(/_/g, "/");
  const buffer = Buffer.from(normalized, "base64");
  return buffer.toString("utf-8");
}
