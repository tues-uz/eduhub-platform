import * as React from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

export const slidingPillTabTriggerClassName =
  "relative z-10 rounded-full bg-transparent shadow-none transition-colors duration-200 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:font-bold";

export const SlidingPillTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { activeValue: string }
>(({ className, activeValue, children, ...props }, ref) => {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [indicator, setIndicator] = useState({ left: 0, top: 0, width: 0, height: 0 });

  const updateIndicator = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>('[data-state="active"]');
    if (!active) return;
    setIndicator({
      left: active.offsetLeft,
      top: active.offsetTop,
      width: active.offsetWidth,
      height: active.offsetHeight,
    });
  }, []);

  useLayoutEffect(() => {
    updateIndicator();
  }, [activeValue, updateIndicator, children]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const ro = new ResizeObserver(updateIndicator);
    ro.observe(list);
    window.addEventListener("resize", updateIndicator);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [updateIndicator]);

  return (
    <TabsPrimitive.List
      ref={(node) => {
        listRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={cn(
        "relative inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full bg-black shadow-sm transition-[left,width,top,height] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)]"
        style={{
          left: indicator.left,
          top: indicator.top,
          width: indicator.width,
          height: indicator.height,
        }}
      />
      {children}
    </TabsPrimitive.List>
  );
});
SlidingPillTabsList.displayName = "SlidingPillTabsList";
