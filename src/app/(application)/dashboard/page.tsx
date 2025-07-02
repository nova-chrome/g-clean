"use client";

import { useQuery } from "@tanstack/react-query";
import { columns } from "~/features/messages/components/messages-table/columns";
import { DashboardFilters } from "~/features/messages/components/messages-table/dashboard-filters";
import { DataTable } from "~/features/messages/components/messages-table/data-table";
import { useTRPC } from "~/lib/client/trpc/client";

export default function Dashboard() {
  const trpc = useTRPC();

  const getMySyncedMessagesQuery = useQuery({
    ...trpc.messages.getMySyncedMessages.queryOptions({
      limit: 100, // Get 100 messages for table pagination
      offset: 0,
    }),
    select: (data) => data.data,
  });

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={getMySyncedMessagesQuery.data || []}>
        {(table) => (
          <DashboardFilters
            table={table}
            messages={getMySyncedMessagesQuery.data || []}
          />
        )}
      </DataTable>
    </div>
  );
}
