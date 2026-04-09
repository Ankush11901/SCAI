"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  LayoutGrid,
  Table2,
  Layers,
  BookOpen,
  X,
  Zap,
  History,
  Settings,
  Layout,
  FlaskConical,
  DollarSign,
  Coins,
} from "lucide-react";
import { useState, useEffect, createContext, useContext, useMemo } from "react";
import type { User } from "@/lib/types";
import {
  isWhitelabelUser,
  WHITELABEL_ONLY_ROUTES,
} from "@/lib/utils/whitelabel";
import { useQuota } from "@/lib/hooks/queries";

// Mobile sidebar context
interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  setIsOpen: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

// Animation variants for sidebar
const sidebarVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
      staggerChildren: 0.05,
    },
  },
};

const navItemVariants = {
  hidden: { x: -10, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
};

interface SidebarProps {
  user?: User | null;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const NAV_ITEMS = [
  {
    label: "Single Article",
    href: "/generate",
    icon: Sparkles,
    description: "One article at a time",
    restricted: false,
  },
  {
    label: "Bulk Generate",
    href: "/bulk",
    icon: Layers,
    description: "All 9 types at once",
    restricted: false,
  },
  {
    label: "History",
    href: "/history",
    icon: History,
    description: "Past generations",
    restricted: false,
  },
  {
    label: "Visualize",
    href: "/visualize",
    icon: LayoutGrid,
    description: "Component reference",
    restricted: true, // Whitelabel only
  },
  {
    label: "Mockups",
    href: "/mockups",
    icon: Layout,
    description: "Full article previews",
    restricted: true, // Whitelabel only
  },
  {
    label: "Matrix",
    href: "/matrix",
    icon: Table2,
    description: "Component requirements",
    restricted: true, // Whitelabel only
  },
  {
    label: "Rules & Guidelines",
    href: "/guidelines",
    icon: BookOpen,
    description: "All specs and standards",
    restricted: true, // Whitelabel only
  },
  {
    label: "Prompts",
    href: "/prompts",
    icon: FlaskConical,
    description: "Test AI prompts",
    restricted: true, // Whitelabel only
  },
  {
    label: "Costs",
    href: "/costs",
    icon: DollarSign,
    description: "AI usage & costs",
    restricted: true, // Whitelabel only
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Preferences & config",
    restricted: false,
  },
] as const;


/**
 * Sidebar
 * Main navigation sidebar with user info
 */
export default function Sidebar({
  user,
  isMobile = false,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: quotaData } = useQuota();
  const quota = quotaData?.quota;
  const credits = quotaData?.credits;

  // Check if user has whitelabel domain access
  const hasWhitelabelAccess = useMemo(() => {
    return isWhitelabelUser(user?.email);
  }, [user?.email]);

  // Filter navigation items based on user access
  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      // Show all items if user has whitelabel access
      if (hasWhitelabelAccess) return true;
      // Hide restricted items for non-whitelabel users
      return !item.restricted;
    });
  }, [hasWhitelabelAccess]);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile && onClose) {
      onClose();
    }
  }, [pathname, isMobile, onClose]);

  const sidebarContent = (
    <>
      {/* Logo Header */}
      <div className="p-6 border-b border-scai-border flex items-center justify-between">
        <Link href="/generate">
          <Image
            src="/scai-full-logo.svg"
            alt="SEO Content AI"
            width={180}
            height={26}
            priority
          />
        </Link>
        {/* Mobile close button */}
        {isMobile && (
          <motion.button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-scai-text-muted hover:text-scai-text hover:bg-scai-input transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-5 h-5" />
          </motion.button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <motion.div
          className="mb-2 px-3 text-xs font-medium text-scai-text-muted uppercase tracking-wider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Main
        </motion.div>
        <motion.ul
          className="space-y-1"
          variants={sidebarVariants}
          initial="hidden"
          animate="visible"
        >
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <motion.li key={item.href} variants={navItemVariants}>
                <Link
                  href={item.href}
                  className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group"
                  onClick={isMobile ? onClose : undefined}
                >
                  {/* Active indicator - animated bar */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId={
                          isMobile ? "activeIndicatorMobile" : "activeIndicator"
                        }
                        className="absolute inset-0 bg-scai-input border border-scai-border rounded-lg"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Hover background */}
                  {!isActive && (
                    <motion.div
                      className="absolute inset-0 bg-scai-input/0 rounded-lg"
                      whileHover={{
                        backgroundColor: "rgba(var(--scai-input-rgb), 0.5)",
                      }}
                      transition={{ duration: 0.2 }}
                    />
                  )}

                  <motion.div
                    className={`relative z-10 w-5 h-5 ${
                      isActive
                        ? "text-scai-brand1"
                        : "text-scai-text-sec group-hover:text-scai-text"
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <item.icon className="w-5 h-5" />
                  </motion.div>
                  <div
                    className={`relative z-10 ${
                      isActive
                        ? "text-scai-brand1"
                        : "text-scai-text-sec group-hover:text-scai-text"
                    }`}
                  >
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-scai-text-muted">
                      {item.description}
                    </div>
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      </nav>

      {/* Quota & Credit Display */}
      {quota && (
        <motion.div
          className="mx-4 mb-4 p-3 rounded-xl bg-scai-input/50 border border-scai-border space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {/* Daily Quota — only show when credit system is not active */}
          {!credits && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-scai-brand1" />
                <span className="text-xs font-medium text-scai-text-sec">
                  Daily Quota
                </span>
              </div>
              {quota.unlimited ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gradient-primary rounded-full" />
                  <span className="text-xs font-medium text-scai-brand1">
                    Unlimited
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-scai-page rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(quota.used / quota.limit) * 100}%` }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    />
                  </div>
                  <span className="text-xs font-medium tabular-nums">
                    {quota.used}/{quota.limit}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Credits Display */}
          {credits && (
            <div className="space-y-3">
              {/* Header with total */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-scai-brand1/15">
                    <Coins className="w-3.5 h-3.5 text-scai-brand1" />
                  </div>
                  <span className="text-xs font-medium text-scai-text">
                    Credits
                  </span>
                </div>
                {credits.isUnlimited ? (
                  <span className="text-sm font-semibold text-scai-brand1">
                    Unlimited
                  </span>
                ) : (
                  <span className="text-sm font-semibold tabular-nums text-scai-brand1">
                    {(credits.total ?? 0).toLocaleString()}
                  </span>
                )}
              </div>
              
              {/* Unlimited badge for whitelabel users */}
              {credits.isUnlimited && (
                <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-scai-brand1/10">
                  <Zap className="w-3.5 h-3.5 text-scai-brand1" />
                  <span className="text-xs text-scai-brand1">Team Account</span>
                </div>
              )}
              
              {/* Monthly usage (for free and pro tiers) */}
              {!credits.isUnlimited && credits.monthly && credits.monthly.limit > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-scai-text-muted">Monthly</span>
                    <span className="tabular-nums text-scai-text-sec">
                      {credits.monthly.remaining.toLocaleString()}/{credits.monthly.limit.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-scai-page rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-scai-brand1 to-scai-brand2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${Math.max(0, (credits.monthly.remaining / credits.monthly.limit) * 100)}%` 
                      }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    />
                  </div>
                </div>
              )}
              
              {/* PAYG balance if any (only show for pro/payg tiers, not free tier) */}
              {!credits.isUnlimited && credits.payg && credits.payg.balance > 0 && 
               credits.tier && credits.tier !== 'free' && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-scai-border">
                  <span className="text-scai-text-muted">PAYG Balance</span>
                  <span className="tabular-nums text-scai-text-sec">
                    +{credits.payg.balance.toLocaleString()}
                  </span>
                </div>
              )}
              
              {/* Helpful context */}
              {!credits.isUnlimited && (
                <p className="text-[10px] text-scai-text-muted leading-tight">
                  ~{Math.floor((credits.total ?? 0) / 17)} articles remaining
                </p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Version */}
      <motion.div
        className="p-4 border-t border-scai-border"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="text-center">
          <div className="text-xs text-scai-text-muted">
            SCAI Generator v1.0.0
          </div>
        </div>
      </motion.div>
    </>
  );

  // Desktop sidebar - always visible
  if (!isMobile) {
    return (
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-scai-card border-r border-scai-border flex-col z-sidebar">
        {sidebarContent}
      </aside>
    );
  }

  // Mobile sidebar - slide-out drawer
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.aside
            className="fixed left-0 top-0 h-full w-72 bg-scai-card border-r border-scai-border flex flex-col z-50 lg:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {sidebarContent}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// Mobile Sidebar Provider
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}
