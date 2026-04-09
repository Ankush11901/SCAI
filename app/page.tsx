import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { HomePage } from "@/components/landing/HomePage";

/**
 * Root page - Shows landing page for visitors, redirects to dashboard if authenticated
 */
export default async function Home() {
  try {
    const cookieStore = await cookies();

    // Convert cookies to header string format for Better Auth
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    // Validate session properly instead of just checking cookie existence
    const session = await auth.api.getSession({
      headers: new Headers({
        cookie: cookieHeader,
      }),
    });

    if (session?.user) {
      redirect("/generate");
    }
  } catch (e) {
    // If auth fails (e.g. missing DB config), show landing page anyway
  }

  return <HomePage />;
}
