"use client";

import { useQuery } from "@tanstack/react-query";
import { DataTable } from "~/components/ui/data-table";
import { columns } from "~/features/messages/components/messages-table/columns";
import { useTRPC } from "~/lib/client/trpc/client";

export default function Home() {
  const trpc = useTRPC();
  const getMyMessagesQuery = useQuery(
    trpc.messages.getMyMessages.queryOptions()
  );

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={getMyMessagesQuery.data?.data || []} />
    </div>
  );
}
