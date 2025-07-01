import { useUser } from "@clerk/nextjs";

export function getUserAvatarFallback(
  user?: ReturnType<typeof useUser>["user"]
): string {
  if (user?.username) {
    return user.username.slice(0, 2).toUpperCase();
  }

  if (user?.fullName) {
    const nameParts = user.fullName
      .split(" ")
      .filter((part) => part.length > 0);
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    } else if (nameParts.length === 1) {
      return nameParts[0].slice(0, 2).toUpperCase();
    }
  }

  if (user?.firstName) {
    return user.firstName[0].toUpperCase();
  }

  if (user?.lastName) {
    return user.lastName[0].toUpperCase();
  }

  return "U";
}
