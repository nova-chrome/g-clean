"use client";

import { useQuery } from "@tanstack/react-query";
import { ArchiveIcon, Trash2Icon } from "lucide-react";
import { useParams } from "next/navigation";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { useTRPC } from "~/lib/client/trpc/client";

export default function MessagePage() {
  const params = useParams<{ id: string }>();
  const trpc = useTRPC();
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
                <Badge
                  key={labelId}
                  variant="secondary"
                  className={getLabelColor(labelId)}
                >
                  {labelId.replace("CATEGORY_", "").toLowerCase()}
                </Badge>
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
                    <p className="text-sm text-muted-foreground">
                      to {message.to}
                    </p>
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
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          {/* Message Body */}
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.body ? (
                <EmailIframe body={message.body} />
              ) : (
                <p className="text-muted-foreground">No content available</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
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

interface EmailIframeProps {
  body: string;
}

function EmailIframe({ body }: EmailIframeProps) {
  // Clean and process the email body
  const processedBody = React.useMemo(() => {
    // Check if the body contains HTML tags
    const hasHtml = /<[^>]+>/.test(body);

    if (!hasHtml) {
      // If it's plain text, convert line breaks to HTML
      return body.replace(/\n/g, "<br>");
    }

    // If it contains HTML, try to extract just the HTML part
    // Many emails have plain text followed by HTML content
    const htmlMatch = body.match(
      /<!DOCTYPE html[\s\S]*<\/html>|<html[\s\S]*<\/html>/i
    );
    if (htmlMatch) {
      return htmlMatch[0];
    }

    // Look for content that starts with HTML tags
    const htmlStartMatch = body.match(/<(?:div|table|body|html)[\s\S]*$/i);
    if (htmlStartMatch) {
      return htmlStartMatch[0];
    }

    // If we can't find clean HTML, but there are HTML tags, clean it up
    if (hasHtml) {
      // Remove excessive whitespace and line breaks before HTML content
      return body.replace(/^[\s\r\n]*(?=<)/gm, "");
    }

    return body;
  }, [body]);

  return (
    <div className="relative">
      <iframe
        srcDoc={`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  margin: 0;
                  padding: 20px;
                  background: white;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
                }
                /* Reset styles that might conflict */
                * {
                  max-width: 100% !important;
                  box-sizing: border-box;
                }
                img {
                  max-width: 100% !important;
                  height: auto !important;
                  display: block;
                }
                table {
                  width: 100% !important;
                  border-collapse: collapse;
                  table-layout: fixed;
                }
                td, th {
                  word-wrap: break-word;
                  overflow-wrap: break-word;
                }
                /* Prevent fixed positioning that could break layout */
                * {
                  position: static !important;
                }
                /* Hide potential duplicate content */
                .gmail_quote {
                  display: none !important;
                }
                /* Style for plain text emails */
                pre {
                  white-space: pre-wrap;
                  font-family: inherit;
                  margin: 0;
                }
              </style>
            </head>
            <body>
              ${processedBody}
            </body>
          </html>
        `}
        className="w-full border-0 bg-white rounded"
        style={{ minHeight: "200px" }}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        onLoad={(e) => {
          const iframe = e.target as HTMLIFrameElement;
          const doc = iframe.contentDocument;
          if (doc) {
            // Auto-resize iframe to content
            const resizeIframe = () => {
              const height = Math.max(
                doc.body.scrollHeight,
                doc.body.offsetHeight,
                doc.documentElement.scrollHeight,
                doc.documentElement.offsetHeight
              );
              iframe.style.height = Math.max(height, 200) + "px";
            };

            // Wait for images to load before resizing
            const images = doc.images;
            let loadedImages = 0;

            const checkResize = () => {
              loadedImages++;
              if (loadedImages === images.length) {
                resizeIframe();
              }
            };

            if (images.length === 0) {
              resizeIframe();
            } else {
              Array.from(images).forEach((img) => {
                if (img.complete) {
                  checkResize();
                } else {
                  img.onload = checkResize;
                  img.onerror = checkResize;
                }
              });
            }

            // Watch for content changes
            const observer = new MutationObserver(() => {
              setTimeout(resizeIframe, 100);
            });
            observer.observe(doc.body, {
              childList: true,
              subtree: true,
              attributes: true,
            });
          }
        }}
      />
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          {/* Subject skeleton */}
          <div>
            <Skeleton className="h-8 w-3/4" />
          </div>

          {/* Labels skeleton */}
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>

          {/* Message Header skeleton */}
          <div className="flex items-start gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>

          {/* Action Buttons skeleton */}
          <div className="flex gap-2">
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>

          {/* Subject Section skeleton */}
          <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          {/* Message Body skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="pt-4">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
