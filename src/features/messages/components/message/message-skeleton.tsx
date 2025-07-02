import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";

export function MessageSkeleton() {
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
