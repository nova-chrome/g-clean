import { ArchiveIcon, Trash2Icon } from "lucide-react";
import { Fragment } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Message } from "~/lib/server/db/schema";
import { LabelBadge } from "../label-badge";

interface MessageHeaderProps {
  message: Message;
}

export function MessageHeader({ message }: MessageHeaderProps) {
  return (
    <Fragment>
      {/* Subject */}
      <div>
        <h1 className="text-2xl font-semibold leading-tight">
          {message.subject || "No Subject"}
        </h1>
      </div>

      {/* Labels */}
      {message.labelIds && message.labelIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {message.labelIds.map((labelId) => (
            <LabelBadge
              key={labelId}
              labelId={labelId}
              variant="secondary"
              className={getLabelColor(labelId)}
            />
          ))}
        </div>
      )}

      {/* Message Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={`/placeholder.svg?height=40&width=40`} />
          <AvatarFallback>{getInitials(message.from)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{message.from}</p>
              {message.to && (
                <p className="text-sm text-muted-foreground">to {message.to}</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(message.date)}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm">
            <ArchiveIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Trash2Icon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Subject Section */}
      <div className="mt-4 p-4 bg-muted/30 rounded-lg">
        <h2 className="text-lg font-medium">
          {message.subject || "No Subject"}
        </h2>
        {message.snippet && (
          <p className="text-sm text-muted-foreground mt-1">
            {message.snippet}
          </p>
        )}
      </div>
    </Fragment>
  );
}

function getLabelColor(labelId: string) {
  const colors: Record<string, string> = {
    INBOX: "bg-blue-100 text-blue-800",
    IMPORTANT: "bg-red-100 text-red-800",
    CATEGORY_UPDATES: "bg-green-100 text-green-800",
    CATEGORY_PROMOTIONS: "bg-purple-100 text-purple-800",
    CATEGORY_SOCIAL: "bg-orange-100 text-orange-800",
  };
  return colors[labelId] || "bg-gray-100 text-gray-800";
}

function formatDate(dateString: string | null) {
  if (!dateString) return "No date";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(email: string) {
  const name = email.split("@")[0];
  return name
    .split(".")
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}
