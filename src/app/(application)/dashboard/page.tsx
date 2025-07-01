"use client";

import { useQuery } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import { DataTableFacetedFilter } from "~/components/data-table-faceted-filter";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { columns } from "~/features/messages/components/messages-table/columns";
import { DataTable } from "~/features/messages/components/messages-table/data-table";
import { Message } from "~/features/messages/types";
import { useTRPC } from "~/lib/client/trpc/client";

export default function Dashboard() {
  const trpc = useTRPC();

  const getMySyncedMessagesQuery = useQuery(
    trpc.messages.getMySyncedMessages.queryOptions({
      limit: 100, // Get 100 messages for table pagination
      offset: 0,
    })
  );

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Messages Dashboard</h1>
        <p className="text-gray-600">
          Showing {getMySyncedMessagesQuery.data?.totalCount || 0} synced
          messages
          {getMySyncedMessagesQuery.data?.userId && (
            <span className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded">
              User: {getMySyncedMessagesQuery.data.userId.substring(0, 12)}...
            </span>
          )}
        </p>
      </div>

      <DataTable
        columns={columns}
        data={(getMySyncedMessagesQuery.data?.data || []) as Message[]}
      >
        {(table) => (
          <>
            <Input
              placeholder="Filter subjects..."
              value={
                (table.getColumn("subject")?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn("subject")?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />

            {table.getColumn("labels") && (
              <DataTableFacetedFilter
                column={table.getColumn("labels")}
                title="Labels"
                options={[
                  ...new Set(
                    getMySyncedMessagesQuery.data?.data
                      .map((msg) => msg.labelIds)
                      .flat()
                      .filter(Boolean)
                  ),
                ].map((labelId) => ({
                  label: labelId || "",
                  value: labelId || "",
                }))}
              />
            )}

            {table.getState().columnFilters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.resetColumnFilters()}
              >
                Reset
                <XIcon />
              </Button>
            )}
          </>
        )}
      </DataTable>
    </div>
  );
}
