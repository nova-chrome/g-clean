"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArchiveIcon,
  ArrowRightIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { DataTableColumnHeader } from "~/components/ui/data-table/data-table-column-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useTRPC } from "~/lib/client/trpc/client";
import { Message } from "~/lib/server/db/schema";
import { LabelBadge } from "../label-badge";

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
    cell: function SubjectCell({ row }) {
      const trpc = useTRPC();
      const queryClient = useQueryClient();
      const subject = row.getValue<string | undefined>("subject");
      return (
        <div className="flex group items-center justify-between">
          <span className="font-medium">{subject}</span>
          <Button
            size="sm"
            variant="outline"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs border-primary hover:bg-accent hover:text-accent-foreground px-2"
            asChild
          >
            <Link
              href={`/messages/${row.original.id}`}
              onClick={() => {
                queryClient.setQueryData(
                  trpc.messages.getMySyncedMessage.queryKey({
                    messageId: row.original.id,
                  }),
                  () => row.original
                );
              }}
            >
              <ArrowRightIcon className="h-3 w-3 mr-1" />
              View
            </Link>
          </Button>
        </div>
      );
    },
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
    id: "labels",
    accessorKey: "labelIds",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Labels" />
    ),
    filterFn: "arrIncludesSome",
    cell: ({ row }) => {
      const labelIds = row.getValue<string[] | undefined>("labels");
      return (
        <div className="flex flex-wrap gap-1">
          {labelIds?.map((labelId) => (
            <LabelBadge key={labelId + Math.random()} labelId={labelId} />
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
  {
    id: "actions",
    enableHiding: false,
    cell: () => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
              >
                <ArchiveIcon />
                Archive
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
              >
                <Trash2Icon />
                Trash
              </Button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
