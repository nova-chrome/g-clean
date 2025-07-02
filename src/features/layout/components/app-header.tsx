import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "~/components/mode-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { generateBreadcrumbSegments } from "../util/generate-breadcrumbs-segments";

export function AppHeader() {
  const pathname = usePathname();
  const breadcrumbSegments = generateBreadcrumbSegments(pathname);

  return (
    <header className="flex justify-between mr-3 h-16 shrink-0 items-center gap-2 border-b">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink asChild>
                <Link href="/">G-Clean</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbSegments.map((segment) => (
              <div key={segment.href} className="flex items-center">
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  {segment.isLast ? (
                    <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={segment.href}>{segment.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <ModeToggle />
    </header>
  );
}
