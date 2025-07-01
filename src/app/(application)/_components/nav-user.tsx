"use client";

import {
  ClerkLoaded,
  ClerkLoading,
  SignOutButton,
  useUser,
} from "@clerk/nextjs";
import { BadgeCheck, ChevronsUpDown, LogOut, Sparkles } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import { Skeleton } from "~/components/ui/skeleton";

export function NavUser() {
  const { user } = useUser();
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <NavUserDisplay user={user} />
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <NavUserDisplay user={user} />
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                <Sparkles />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {/* NOTE: Add more items here */}
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <BadgeCheck />
                  Profile
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <SignOutButton>
              <DropdownMenuItem>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </SignOutButton>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function NavUserDisplay({
  user,
}: {
  user?: ReturnType<typeof useUser>["user"];
}) {
  const email = user?.primaryEmailAddress?.emailAddress ?? "No email";
  const username = getUserDisplayName(user);
  const fallback = getUserAvatarFallback(user);

  return (
    <>
      <ClerkLoading>
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="grid flex-1 text-left text-sm leading-tight">
          <Skeleton className="h-4 w-20 mb-1" />
          <Skeleton className="h-3 w-32" />
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <Avatar className="h-8 w-8 rounded-lg">
          <AvatarImage src={user?.imageUrl} alt={username} />
          <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium">{username}</span>
          <span className="truncate text-xs">{email}</span>
        </div>
      </ClerkLoaded>
    </>
  );
}

function getUserDisplayName(user?: ReturnType<typeof useUser>["user"]) {
  if (user?.username) {
    return user.username;
  }

  if (user?.fullName) {
    return user.fullName;
  }

  if (user?.firstName || user?.lastName) {
    const firstName = user?.firstName || "";
    const lastName = user?.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName;
  }

  return "No username";
}

function getUserAvatarFallback(
  user?: ReturnType<typeof useUser>["user"]
): string {
  if (user?.username) {
    return user.username.slice(0, 2).toUpperCase();
  }

  if (user?.fullName) {
    const nameParts = user.fullName
      .split(" ")
      .filter((part) => part.length > 0);
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    } else if (nameParts.length === 1) {
      return nameParts[0].slice(0, 2).toUpperCase();
    }
  }

  if (user?.firstName) {
    return user.firstName[0].toUpperCase();
  }

  if (user?.lastName) {
    return user.lastName[0].toUpperCase();
  }

  return "U";
}
