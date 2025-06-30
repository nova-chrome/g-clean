"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "~/components/data-table-column-header";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import { Message } from "~/features/messages/types";

export const columns: ColumnDef<Message>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => row.getValue<string | undefined>("subject"),
    enableHiding: false,
  },
  {
    accessorKey: "from",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="From" />
    ),
    cell: ({ row }) => row.getValue<string | undefined>("from"),
  },
  {
    accessorKey: "labelIds",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Labels" />
    ),
    filterFn: "arrIncludesAll",
    cell: ({ row }) => {
      const labelIds = row.getValue<string[] | undefined>("labelIds");
      return (
        <div className="flex flex-wrap gap-1">
          {labelIds?.map((labelId) => (
            <Badge key={labelId + Math.random()} variant="secondary">
              {labelId}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    id: "date",
    sortingFn: (a, b) => {
      const dateA = new Date(a.getValue("date"));
      const dateB = new Date(b.getValue("date"));
      return dateA.getTime() - dateB.getTime();
    },
    accessorFn: (row) => row.date,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ getValue }) => {
      const value = getValue<string | undefined>();
      const date = value ? new Date(value) : undefined;
      return date?.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    },
  },
  {
    id: "time",
    accessorFn: (row) => row.date,
    header: "Time",
    cell: ({ getValue }) => {
      const value = getValue<string | undefined>();
      const date = value ? new Date(value) : undefined;
      return date?.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  },
];
