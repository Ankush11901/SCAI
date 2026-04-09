import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isWhitelabelUser } from "@/lib/utils/whitelabel";
import PromptsClient from "./PromptsClient";

/**
 * Prompt Testing Page - Server Component
 *
 * This page is restricted to whitelabel users (admins) only.
 * Non-whitelabel users will be silently redirected to /generate.
 *
 * Allows admins to:
 * - View all prompts in the system with descriptions
 * - Test prompts with Gemini, OpenAI, and Claude
 * - Edit prompts temporarily before running
 * - Compare outputs between providers
 * - View test history
 */
export default async function PromptsPage() {
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

  return <PromptsClient />;
}
