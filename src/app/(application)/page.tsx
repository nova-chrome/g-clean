"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/lib/client/trpc/client";

export default function Home() {
  const trpc = useTRPC();
  const getMyMessagesQuery = useQuery(
    trpc.messages.getMyMessages.queryOptions()
  );

  return <pre>{JSON.stringify(getMyMessagesQuery.data, null, 2)}</pre>;
}
