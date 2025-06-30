"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Message } from "~/features/messages/types";

export const columns: ColumnDef<Message>[] = [
  {
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => row.getValue<string | undefined>("subject"),
  },
  {
    accessorKey: "from",
    header: "From",
    cell: ({ row }) => row.getValue<string | undefined>("from"),
  },
  {
    accessorKey: "to",
    header: "To",
    cell: ({ row }) => row.getValue<string | undefined>("to"),
  },
  {
    accessorFn: (row) => row.date,
    header: "Date",
    id: "date",
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
    accessorFn: (row) => row.date,
    header: "Time",
    id: "time",
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
