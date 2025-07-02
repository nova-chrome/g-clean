import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

interface LabelBadgeProps {
  labelId: string;
  className?: string;
  variant?: "secondary" | "default";
}

export function LabelBadge({
  labelId,
  className,
  variant = "secondary",
}: LabelBadgeProps) {
  return (
    <Badge variant={variant} className={cn(getLabelColor(labelId), className)}>
      {labelId.replace("CATEGORY_", "").toLowerCase()}
    </Badge>
  );
}

function getLabelColor(labelId: string) {
  const colors: Record<string, string> = {
    INBOX: "bg-blue-100 text-blue-800",
    IMPORTANT: "bg-red-100 text-red-800",
    UNREAD: "bg-yellow-100 text-yellow-800",
    CATEGORY_UPDATES: "bg-green-100 text-green-800",
    CATEGORY_PROMOTIONS: "bg-purple-100 text-purple-800",
    CATEGORY_SOCIAL: "bg-orange-100 text-orange-800",
    CATEGORY_PERSONAL: "bg-pink-100 text-pink-800",
  };
  return colors[labelId] || "bg-gray-100 text-gray-800";
}
