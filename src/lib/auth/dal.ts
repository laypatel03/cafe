import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { decryptSession, SESSION_COOKIE } from "./session";

export type CurrentUser = { id: string; name: string; username: string; role: Role };

/**
 * Data Access Layer: the real auth check. Every admin page and server action calls
 * this – the proxy only does a quick cookie check for redirects.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const session = await decryptSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.staffUser.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, username: true, role: true, active: true, sessionVersion: true },
  });
  if (!user || !user.active || user.sessionVersion !== session.version) return null;
  return { id: user.id, name: user.name, username: user.username, role: user.role };
});

/**
 * Who may open what. The default is the café team: developers manage the website only and
 * never see orders, money or customers, so a new page stays closed to them unless it opts in.
 */
const ACCESS = {
  team: ["STAFF", "OWNER"],
  OWNER: ["OWNER"],
  website: ["OWNER", "DEVELOPER"],
  anyone: ["STAFF", "OWNER", "DEVELOPER"],
} as const satisfies Record<string, readonly Role[]>;
export type Access = keyof typeof ACCESS;

const DENIED: Record<Access, string> = {
  team: "Developer logins can't open orders or money.",
  OWNER: "Only the owner can do this.",
  website: "Only the owner or a developer can do this.",
  anyone: "",
};

export const canAccess = (role: Role, access: Access) => (ACCESS[access] as readonly Role[]).includes(role);

/** Where a role lands in the dashboard. */
export const homeFor = (role: Role) => (role === "DEVELOPER" ? "/admin/menu" : "/admin");

/** For pages: redirect to login (or the role's own start page if it may not open this one). */
export async function requireUser(access: Access = "team"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/session-ended");
  if (!canAccess(user.role, access)) redirect(homeFor(user.role));
  return user;
}

export class AuthError extends Error {}

/** For server actions: throw instead of redirecting. */
export async function assertUser(access: Access = "team"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Please log in again.");
  if (!canAccess(user.role, access)) throw new AuthError(DENIED[access]);
  return user;
}
