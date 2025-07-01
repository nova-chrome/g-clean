"use client";

import { PropsWithChildren } from "react";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { AppHeader } from "~/features/layout/components/app-header";
import { AppSidebar } from "~/features/layout/components/app-sidebar";

export default function ApplicationLayout({
  children,
}: Readonly<PropsWithChildren>) {
  return (
    <SidebarProvider>
      <div className="flex h-full w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-hidden">
          <AppHeader />
          <ScrollArea className="h-[calc(100vh-5rem)] px-4" type="auto">
            {children}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
