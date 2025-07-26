import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { useState } from "react";

type DataTableDefaults<TData, TValue> = {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
};

export function useDataTableDefaults<TData, TValue>({
  data,
  columns,
}: DataTableDefaults<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    labels: false,
  });
  const [rowSelection, setRowSelection] = useState({});

  return useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),

    // sorting
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),

    // filtering
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),

    // visibility
    onColumnVisibilityChange: setColumnVisibility,

    // row selection
    onRowSelectionChange: setRowSelection,

    // pagination
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });
}
