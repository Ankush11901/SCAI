"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ─── Context ────────────────────────────────────────────────────────────────
// Share open state between Sheet (root) and SheetContent (AnimatePresence)

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue>({
  open: false,
  onOpenChange: () => {},
});

// ─── Sheet (Root) ───────────────────────────────────────────────────────────

interface SheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

function Sheet({ children, open: controlledOpen, onOpenChange, defaultOpen = false }: SheetProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const handleOpenChange = onOpenChange ?? setInternalOpen;

  return (
    <SheetContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        {children}
      </DialogPrimitive.Root>
    </SheetContext.Provider>
  );
}

// ─── SheetTrigger ───────────────────────────────────────────────────────────

const SheetTrigger = DialogPrimitive.Trigger;

// ─── SheetClose ─────────────────────────────────────────────────────────────

const SheetClose = DialogPrimitive.Close;

// ─── SheetContent ───────────────────────────────────────────────────────────

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const { open } = React.useContext(SheetContext);

  return (
    <DialogPrimitive.Portal forceMount>
      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </DialogPrimitive.Overlay>

            {/* Sheet Panel */}
            <DialogPrimitive.Content asChild forceMount ref={ref} {...props}>
              <motion.div
                className={cn(
                  "fixed right-0 top-0 z-50 h-full w-full sm:w-[400px]",
                  "flex flex-col bg-scai-card border-l border-scai-border shadow-card",
                  "focus:outline-none",
                  className
                )}
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {children}

                {/* Close button */}
                <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-scai-text-muted transition-all hover:bg-scai-border/50 hover:text-scai-text">
                  <motion.div
                    whileHover={{ rotate: 90 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <X className="h-4 w-4" />
                  </motion.div>
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              </motion.div>
            </DialogPrimitive.Content>
          </>
        )}
      </AnimatePresence>
    </DialogPrimitive.Portal>
  );
});
SheetContent.displayName = "SheetContent";

// ─── SheetHeader ────────────────────────────────────────────────────────────

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-shrink-0 border-b border-scai-border p-5 pr-12", className)}
      {...props}
    />
  );
}
SheetHeader.displayName = "SheetHeader";

// ─── SheetTitle ─────────────────────────────────────────────────────────────

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-xl font-semibold text-scai-text", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

// ─── SheetDescription ───────────────────────────────────────────────────────

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("mt-1.5 text-sm text-scai-text-sec", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

// ─── SheetFooter ────────────────────────────────────────────────────────────

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-shrink-0 border-t border-scai-border p-5 flex justify-end gap-3", className)}
      {...props}
    />
  );
}
SheetFooter.displayName = "SheetFooter";

// ─── Exports ────────────────────────────────────────────────────────────────

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
};
