"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  User as UserIcon,
  ChevronDown,
  Menu,
  ChevronRight,
  Home,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { signOut } from "@/lib/auth-client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { User } from "@/lib/types";

interface TopBarProps {
  user?: User | null;
  onMenuClick?: () => void;
}

// Breadcrumb configuration
const BREADCRUMB_LABELS: Record<string, string> = {
  generate: "Generate Article",
  bulk: "Bulk Generate",
  visualize: "Component Variations",
  matrix: "Component Matrix",
  guidelines: "Rules & Guidelines",
};

/**
 * TopBar
 * Top navigation bar with breadcrumb and user actions
 */
export default function TopBar({ user, onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch for Radix components
  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate breadcrumbs from pathname
  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href: string }[] = [];

    let currentPath = "";
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath += `/${segment}`;
      const label =
        BREADCRUMB_LABELS[segment] ||
        segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // Handle special cases where intermediate segments don't have their own pages
      let href = currentPath;
      
      // For /history/bulk/* paths, make "Bulk Generate" link back to /history
      if (segment === 'bulk' && segments[i - 1] === 'history') {
        href = '/history';
      }
      
      crumbs.push({ label, href });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
      },
    });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-scai-border bg-scai-card px-4 lg:px-6">
      {/* Left side: Menu + Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <motion.button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden rounded-lg p-2 text-scai-text-muted transition-all hover:bg-scai-input hover:text-scai-text"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Menu className="h-5 w-5" />
        </motion.button>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/generate"
            className="flex items-center text-scai-text-muted hover:text-scai-text transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <span key={`${index}-${crumb.href}`} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4 text-scai-text-muted" />
              {index === breadcrumbs.length - 1 ? (
                <span className="font-medium text-scai-text">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-scai-text-muted hover:text-scai-text transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* User dropdown */}
        {mounted && user ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all hover:bg-scai-input"
              >
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="rounded-full border border-scai-border"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-scai-brand1/20">
                    <UserIcon className="h-4 w-4 text-scai-brand1" />
                  </div>
                )}
                <span className="hidden text-sm font-medium sm:inline">
                  {user.name?.split(" ")[0]}
                </span>
                <ChevronDown className="h-4 w-4 text-scai-text-muted" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[200px] rounded-xl border border-scai-border bg-scai-card p-2 shadow-lg"
                sideOffset={8}
                align="end"
              >
                {/* User info */}
                <div className="mb-2 border-b border-scai-border px-3 py-2">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-scai-text-muted">
                    {user.email}
                  </div>
                </div>

                {/* Menu items */}
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-scai-text-muted outline-none transition-colors hover:bg-scai-input hover:text-red-400"
                  onSelect={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-scai-text-muted transition-all hover:bg-scai-input hover:text-scai-text"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}
