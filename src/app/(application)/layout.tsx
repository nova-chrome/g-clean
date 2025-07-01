"use client";

import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { AppSidebar } from "./_components/app-sidebar";

export default function ApplicationLayout({
  children,
}: Readonly<PropsWithChildren>) {
  const pathname = usePathname();
  const formattedPathname = formatPathnameToTitleCase(pathname);

  return (
    <SidebarProvider>
      <div className="flex h-full w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#">G-Clean</BreadcrumbLink>
                  </BreadcrumbItem>
                  {formattedPathname && (
                    <>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{formattedPathname}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <ScrollArea className="h-[calc(100vh-5rem)] px-4" type="auto">
            {children}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function formatPathnameToTitleCase(pathname: string): string {
  const segment = pathname.split("/").pop() || "";
  return (
    segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) ||
    ""
  );
}
