export function extractEmailAddress(fromHeader: string): string {
  const emailMatch = fromHeader.match(/<([^>]+)>/);

  if (emailMatch) {
    return emailMatch[1];
  }

  return fromHeader.trim();
}
