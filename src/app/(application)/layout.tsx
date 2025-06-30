import { SignedIn, UserButton } from "@clerk/nextjs";
import { PropsWithChildren } from "react";

export default function ApplicationLayout({
  children,
}: Readonly<PropsWithChildren>) {
  return (
    <div>
      <header className="flex justify-end items-center p-4 gap-4 h-16">
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
      {children}
    </div>
  );
}
