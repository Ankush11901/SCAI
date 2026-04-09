"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "motion/react";
import { Loader2, Mail, AlertCircle } from "lucide-react";
import { signIn, useSession } from "@/lib/auth-client";
import { toast } from "sonner";

const allowedDomain =
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || "whitelabelresell.com";

/**
 * Login Page Content
 * Google OAuth entry point - restricted to @whitelabelresell.com domain
 */
function LoginContent() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();

  // Check for error in URL params (from OAuth callback)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      // Show toast for auth errors
      if (
        errorParam.includes("domain") ||
        errorParam.includes("email") ||
        errorParam.includes("allowed") ||
        errorParam.includes("unauthorized")
      ) {
        toast.error(`Access Denied`, {
          description: `Only @${allowedDomain} email addresses are allowed.`,
          duration: 6000,
        });
      } else {
        toast.error("Sign in failed", {
          description: decodeURIComponent(errorParam),
          duration: 5000,
        });
      }
      // Clear the error from URL
      router.replace("/login", { scroll: false });
    }
  }, [searchParams, router]);

  // Redirect if already logged in
  useEffect(() => {
    if (session?.user) {
      router.push("/generate");
    }
  }, [session, router]);

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);

    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/generate",
        errorCallbackURL: "/login?error=unauthorized_domain",
      });
    } catch {
      setError("Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  // Show loading while checking session
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-scai-brand1" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background glow effect */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_30%,rgba(64,237,195,0.08)_0%,transparent_50%)]" />

      <motion.div
        className="w-full max-w-md relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo and branding */}
        <div className="text-center mb-10">
          <motion.div
            className="inline-block mb-6"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <Image
              src="/scai-logo.png"
              alt="SEO Content AI"
              width={80}
              height={80}
              priority
            />
          </motion.div>
          <motion.h1
            className="text-3xl font-bold mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            SCAI Article Generator
          </motion.h1>
          <motion.p
            className="text-scai-text-sec"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Sign in with your organization account
          </motion.p>
        </div>

        {/* Login card */}
        <motion.div
          className="bg-scai-card border border-scai-border rounded-2xl p-8 shadow-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="space-y-6">
            {/* Domain notice */}
            <div className="p-4 bg-scai-brand1/10 border border-scai-brand1/20 rounded-xl">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-scai-brand1 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-scai-brand1">
                    Organization Access Only
                  </p>
                  <p className="text-sm text-scai-text-sec mt-1">
                    Only{" "}
                    <span className="font-mono text-scai-brand2">
                      @{allowedDomain}
                    </span>{" "}
                    email addresses are allowed.
                  </p>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                className="p-4 bg-error/10 border border-error/20 rounded-xl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
                  <p className="text-sm text-error">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Google Sign In button */}
            <motion.button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <title>Google Logo</title>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              <span>{isLoading ? "Signing in..." : "Sign in with Google"}</span>
            </motion.button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-scai-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-scai-card px-2 text-scai-text-muted">
                  Secure authentication
                </span>
              </div>
            </div>

            {/* Security note */}
            <p className="text-xs text-scai-text-muted text-center">
              Your data is protected with enterprise-grade security. We only
              access your email to verify your organization membership.
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-center text-sm text-scai-text-muted mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Having trouble signing in? Contact your administrator.
        </motion.p>
      </motion.div>
    </div>
  );
}

/**
 * Login Page with Suspense
 * Wrapped in Suspense because useSearchParams needs it
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-scai-brand1" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
