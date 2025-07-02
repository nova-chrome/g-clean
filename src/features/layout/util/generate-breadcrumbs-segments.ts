export interface BreadcrumbSegment {
  label: string;
  href: string;
  isLast: boolean;
}

export function generateBreadcrumbSegments(
  pathname: string
): BreadcrumbSegment[] {
  const segments = pathname.split("/").filter((segment) => segment !== "");

  if (segments.length === 0) {
    return [];
  }

  const breadcrumbs: BreadcrumbSegment[] = [];

  segments.forEach((segment, index) => {
    if (segment.startsWith("[") && segment.endsWith("]")) {
      return;
    }

    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    breadcrumbs.push({
      label,
      href,
      isLast: index === segments.length - 1,
    });
  });

  return breadcrumbs;
}
