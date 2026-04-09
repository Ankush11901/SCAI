"use client";

import type { ReactNode } from "react";
import { useState, useCallback } from "react";
import type { User } from "@/lib/types";
import Sidebar, { SidebarProvider } from "./Sidebar";
import TopBar from "./TopBar";

interface AppShellProps {
  children: ReactNode;
  user?: User | null;
}

/**
 * AppShell
 * Main application layout with sidebar and top bar
 */
export default function AppShell({ children, user }: AppShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleOpenMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);

  const handleCloseMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-scai-page overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar user={user} />

        {/* Mobile Sidebar */}
        <Sidebar
          user={user}
          isMobile
          isOpen={isMobileSidebarOpen}
          onClose={handleCloseMobileSidebar}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col lg:ml-64">
          {/* Top bar */}
          <TopBar user={user} onMenuClick={handleOpenMobileSidebar} />

          {/* Page content */}
          <main
            id="main-content"
            className="flex-1 overflow-y-auto"
            role="main"
          >
            <div className="mx-auto max-w-[1600px] p-4 lg:p-6">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
