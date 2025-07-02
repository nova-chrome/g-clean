import { Table } from "@tanstack/react-table";
import { XIcon } from "lucide-react";
import { Fragment } from "react";
import { DataTableFacetedFilter } from "~/components/data-table-faceted-filter";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Message } from "~/lib/server/db/schema";

interface DashboardFiltersProps<TData> {
  table: Table<TData>;
  messages: Message[];
}

export function DashboardFilters<TData>({
  table,
  messages,
}: DashboardFiltersProps<TData>) {
  return (
    <Fragment>
      <Input
        placeholder="Filter subjects..."
        value={(table.getColumn("subject")?.getFilterValue() as string) ?? ""}
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
              messages
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
    </Fragment>
  );
}
