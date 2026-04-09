"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils/cn";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-[18px] w-8 shrink-0 cursor-pointer items-center rounded-full p-[3px]",
      "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scai-brand1/20",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-scai-brand1 data-[state=checked]:to-scai-brand2",
      "data-[state=unchecked]:bg-transparent data-[state=unchecked]:border data-[state=unchecked]:border-[#454545]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-3 w-3 rounded-full transition-transform duration-200",
        "data-[state=checked]:translate-x-[14px] data-[state=checked]:bg-[#121212]",
        "data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-[#454545]"
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
