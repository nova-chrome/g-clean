export function formatPathnameToTitleCase(pathname: string) {
  const segment = pathname.split("/").pop() || "";
  return (
    segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) ||
    ""
  );
}
