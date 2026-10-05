import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "@/slides/primitives";

/** Scales a fixed 1920×1080 slide to fit its container while keeping the composition intact. */
export function SlideViewport({
  children,
  className,
  frameClassName,
}: {
  children: ReactNode;
  className?: string;
  frameClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setScale(Math.max(0, Math.min(width / SLIDE_WIDTH, height / SLIDE_HEIGHT)));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={cn("grid size-full min-h-0 place-items-center", className)}>
      {scale > 0 && (
        <div
          className={cn("relative overflow-hidden", frameClassName)}
          style={{ width: SLIDE_WIDTH * scale, height: SLIDE_HEIGHT * scale }}
        >
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT, transform: `scale(${scale})` }}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
