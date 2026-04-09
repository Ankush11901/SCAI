import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { QueryProvider } from "@/components/providers/QueryProvider";
import type { User } from "@/lib/types";
import { auth } from "@/lib/auth";

/**
 * Protected Layout
 * Wraps all authenticated routes with session check and app shell
 *
 * Uses Better Auth's getSession to properly validate the session.
 * Middleware handles the initial redirect for unauthenticated users.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  // Convert cookies to header string format for Better Auth
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // Use Better Auth's getSession with proper headers
  const session = await auth.api.getSession({
    headers: new Headers({
      cookie: cookieHeader,
    }),
  });

  // If no valid session, redirect to login
  if (!session?.user) {
    redirect("/login");
  }

  const user: User = {
    id: session.user.id,
    name: session.user.name || "User",
    email: session.user.email,
    image: session.user.image || null,
  };

  return (
    <QueryProvider>
      <AppShell user={user}>{children}</AppShell>
    </QueryProvider>
  );
}
