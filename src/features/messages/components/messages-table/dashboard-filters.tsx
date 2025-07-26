import { Table } from "@tanstack/react-table";
import { Loader2Icon, XIcon } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { DataTableFacetedFilter } from "~/components/ui/data-table/data-table-faceted-filter";
import { Input } from "~/components/ui/input";
import { useDebounceValue } from "~/hooks/use-debounce-value";
import { Label } from "~/lib/server/db/schema";

interface DashboardFiltersProps<TData> {
  table: Table<TData>;
  labels: Label[];
  search: string;
  onSearchChange: (value: string) => void;
  isSearching?: boolean;
}

export function DashboardFilters<TData>({
  table,
  labels,
  search,
  onSearchChange,
  isSearching = false,
}: DashboardFiltersProps<TData>) {
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounceValue(localSearch, 300);

  // Trigger search when debounced value changes
  useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  return (
    <Fragment>
      <div className="relative max-w-sm">
        <Input
          placeholder="Filter subjects..."
          value={localSearch}
          onChange={(event) => setLocalSearch(event.target.value)}
          className="pr-8"
        />
        {isSearching && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <Loader2Icon className="w-4 h-4 animate-spin" />
          </div>
        )}
      </div>

      {table.getColumn("labels") && (
        <DataTableFacetedFilter
          column={table.getColumn("labels")}
          title="Labels"
          options={labels}
        />
      )}

      {(table.getState().columnFilters.length > 0 || search) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            table.resetColumnFilters();
            setLocalSearch("");
            onSearchChange("");
          }}
        >
          Reset
          <XIcon />
        </Button>
      )}
    </Fragment>
  );
}
