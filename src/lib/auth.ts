import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

export const getCachedCurrentUser = cache(async () => {
  return currentUser();
});

export type Role = "admin" | "teacher" | "student" | "parent";

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Throws if the caller is not signed in or doesn't hold one of the allowed roles.
 * Returns { userId, role } on success.
 */
export function requireRole(...allowed: Role[]) {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new AuthorizationError("Not signed in.");

  const role = (sessionClaims?.metadata as { role?: Role } | undefined)?.role;
  if (!role || !allowed.includes(role)) {
    throw new AuthorizationError("You don't have permission to do that.");
  }
  return { userId, role };
}
