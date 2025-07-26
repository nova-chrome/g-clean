"use client";

import { flexRender, Table as TanstackTable } from "@tanstack/react-table";
import { PropsWithChildren } from "react";
import { DataTableViewOptions } from "~/components/ui/data-table/data-table-view-options";

import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Progress } from "../progress";

interface DataTableProps<TData> {
  table: TanstackTable<TData>;
  isLoading?: boolean;
  isFetching?: boolean;
}

export function DataTable<TData>({
  table,
  children,
  isLoading = false,
  isFetching = false,
}: PropsWithChildren<DataTableProps<TData>>) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {children}

        <DataTableViewOptions table={table} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
            {isFetching && (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleFlatColumns().length}
                  className="p-0"
                >
                  <Progress
                    indeterminate={isFetching}
                    value={100}
                    className="h-0.5 w-full rounded-none"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  {table.getVisibleFlatColumns().map((column, colIndex) => (
                    <TableCell key={`loading-cell-${colIndex}`}>
                      {column.id === "select" ? (
                        <Skeleton className="h-4 w-4 rounded-sm" />
                      ) : column.id === "subject" ? (
                        <Skeleton className="h-8 w-96" />
                      ) : column.id === "from" ? (
                        <Skeleton className="h-8 w-80" />
                      ) : column.id === "date" ? (
                        <Skeleton className="h-8 w-20" />
                      ) : column.id === "time" ? (
                        <Skeleton className="h-8 w-16" />
                      ) : (
                        <Skeleton className="h-8 w-24" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleFlatColumns().length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
