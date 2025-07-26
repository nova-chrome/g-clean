"use client";

import { useQuery } from "@tanstack/react-query";
import { columns } from "~/features/messages/components/messages-table/columns";
import { DashboardFilters } from "~/features/messages/components/messages-table/dashboard-filters";
import { DataTable } from "~/features/messages/components/messages-table/data-table";
import { useTRPC } from "~/lib/client/trpc/client";

export default function MessagesPage() {
  const trpc = useTRPC();

  const getMySyncedMessagesQuery = useQuery({
    ...trpc.messages.getMySyncedMessages.queryOptions({
      limit: 100,
      offset: 0,
    }),
    select: (data) => data.data,
  });

  const getGmailLabelsQuery = useQuery(
    trpc.messages.getMessagesLabels.queryOptions()
  );

  return (
    <div className="container mx-auto py-10">
      <DataTable
        columns={columns}
        data={getMySyncedMessagesQuery.data || []}
        isLoading={getMySyncedMessagesQuery.isLoading}
      >
        {(table) => (
          <DashboardFilters
            table={table}
            labels={getGmailLabelsQuery.data || []}
          />
        )}
      </DataTable>
    </div>
  );
}
