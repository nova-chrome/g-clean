import { useUser } from "@clerk/nextjs";

export function getUserDisplayName(user?: ReturnType<typeof useUser>["user"]) {
  if (user?.username) {
    return user.username;
  }

  if (user?.fullName) {
    return user.fullName;
  }

  if (user?.firstName || user?.lastName) {
    const firstName = user?.firstName || "";
    const lastName = user?.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName;
  }

  return "No username";
}
