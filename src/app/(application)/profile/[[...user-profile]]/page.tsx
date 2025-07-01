"use client";

import { UserProfile } from "@clerk/nextjs";
import { dark, experimental__simple as simple } from "@clerk/themes";
import { useTheme } from "next-themes";

export default function AccountPage() {
  const { theme } = useTheme();
  return (
    <div className="flex justify-center py-10 w-full">
      <UserProfile
        appearance={{ baseTheme: theme === "dark" ? dark : simple }}
      />
    </div>
  );
}
