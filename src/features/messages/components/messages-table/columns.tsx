"use client";

import { useUser } from "@clerk/nextjs";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { DataTableColumnHeader } from "~/components/data-table-column-header";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
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
    accessorKey: "to",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="To" />
    ),
    cell: function ToCell({ row }) {
      const user = useUser();
      const toAddress = row.getValue<string | undefined>("to");
      const googleAccount = user.user?.externalAccounts.find(
        (acc) => acc.provider === "google"
      );
      const isCurrentUser = toAddress === googleAccount?.emailAddress;

      return (
        <div className="inline-flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {isCurrentUser ? (
                  <ArrowDownIcon className="h-4 w-4 text-green-600 cursor-help" />
                ) : (
                  <ArrowUpIcon className="h-4 w-4 text-blue-600 cursor-help" />
                )}
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isCurrentUser
                    ? "Inbound - Email sent to you"
                    : "Outbound - Email sent by you"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {toAddress}
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
