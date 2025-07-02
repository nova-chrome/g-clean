"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { EmailDisplay } from "~/features/messages/components/message/email-display";
import { MessageHeader } from "~/features/messages/components/message/message-header";
import { MessageSkeleton } from "~/features/messages/components/message/message-skeleton";
import { useTRPC } from "~/lib/client/trpc/client";

export default function MessagePage() {
  const trpc = useTRPC();
  const params = useParams<{ id: string }>();
  const { data: message, isLoading } = useQuery(
    trpc.messages.getMySyncedMessage.queryOptions({ messageId: params.id })
  );

  if (isLoading) {
    return <MessageSkeleton />;
  }

  if (!message) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-center text-muted-foreground">Message not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <MessageHeader message={message} />
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          {/* Message Body */}
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              <EmailDisplay body={message.body} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
