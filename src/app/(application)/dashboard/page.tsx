"use client";

import { useQuery } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import { DataTableFacetedFilter } from "~/components/data-table-faceted-filter";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { columns } from "~/features/messages/components/messages-table/columns";
import { DataTable } from "~/features/messages/components/messages-table/data-table";
import { useTRPC } from "~/lib/client/trpc/client";

export default function Dashboard() {
  const trpc = useTRPC();
  const getMyMessagesQuery = useQuery(
    trpc.messages.getMyMessages.queryOptions()
  );

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={getMyMessagesQuery.data?.data || []}>
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
                    getMyMessagesQuery.data?.data
                      .map((msg) => msg.labelIds)
                      .flat()
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
