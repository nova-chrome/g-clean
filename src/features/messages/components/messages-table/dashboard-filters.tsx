import { Table } from "@tanstack/react-table";
import { XIcon } from "lucide-react";
import { Fragment } from "react";
import { Button } from "~/components/ui/button";
import { DataTableFacetedFilter } from "~/components/ui/data-table/data-table-faceted-filter";
import { Input } from "~/components/ui/input";
import { Label } from "~/lib/server/db/schema";

interface DashboardFiltersProps<TData> {
  table: Table<TData>;
  labels: Label[];
}

export function DashboardFilters<TData>({
  table,
  labels,
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
          options={labels}
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
