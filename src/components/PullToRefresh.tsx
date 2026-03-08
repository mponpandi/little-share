import { useState, useRef, useCallback, ReactNode } from "react";
import { motion, useAnimation } from "framer-motion";
import { Loader2, ArrowDown } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  const isAtTop = useCallback(() => {
    if (!containerRef.current) return true;
    return containerRef.current.scrollTop <= 0;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isRefreshing) return;
      if (isAtTop()) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    },
    [isRefreshing, isAtTop]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0 && isAtTop()) {
        // Apply resistance curve
        const distance = Math.min(diff * 0.5, MAX_PULL);
        setPullDistance(distance);
      } else {
        setPullDistance(0);
      }
    },
    [isRefreshing, isAtTop]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || isRefreshing) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD * 0.6);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className || ""}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="flex items-center justify-center overflow-hidden"
        animate={{ height: pullDistance }}
        transition={{ type: "tween", duration: isPulling.current ? 0 : 0.3 }}
      >
        <div className="flex flex-col items-center gap-1 py-2">
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <motion.div
              animate={{ rotate: progress >= 1 ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ArrowDown
                className="w-5 h-5 text-muted-foreground"
                style={{ opacity: progress }}
              />
            </motion.div>
          )}
          <span
            className="text-xs text-muted-foreground"
            style={{ opacity: progress }}
          >
            {isRefreshing
              ? "Refreshing..."
              : progress >= 1
                ? "Release to refresh"
                : "Pull to refresh"}
          </span>
        </div>
      </motion.div>

      {children}
    </div>
  );
}
