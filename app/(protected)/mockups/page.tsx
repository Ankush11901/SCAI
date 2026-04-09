import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isWhitelabelUser } from "@/lib/utils/whitelabel";
import MockupsClient from "./MockupsClient";

/**
 * Mockups Page - Server Component
 *
 * This page is restricted to whitelabel users only.
 * Non-whitelabel users will be silently redirected to /generate.
 * The page will not appear in navigation for unauthorized users.
 */
export default async function MockupsPage() {
  const cookieStore = await cookies();

  // Convert cookies to header string format for Better Auth
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // Get session
  const session = await auth.api.getSession({
    headers: new Headers({
      cookie: cookieHeader,
    }),
  });

  // Check if user has whitelabel access
  if (!session?.user || !isWhitelabelUser(session.user.email)) {
    // Silently redirect unauthorized users to generate page
    redirect("/generate");
  }

  return <MockupsClient />;
}
