import { SignedIn, UserButton } from "@clerk/nextjs";

export default function ApplicationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
