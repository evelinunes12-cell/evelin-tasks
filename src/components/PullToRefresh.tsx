import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const isAtTop = useCallback(() => {
    return window.scrollY <= 0;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isAtTop() && !refreshing) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, [isAtTop, refreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling || refreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0 && isAtTop()) {
      const distance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(distance);
      if (distance > 10) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
    }
  }, [pulling, refreshing, isAtTop]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      await queryClient.invalidateQueries();
      // Small delay for visual feedback
      await new Promise(r => setTimeout(r, 500));
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pulling, pullDistance, refreshing, queryClient]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div ref={containerRef} className="relative min-h-screen">
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center z-50 pointer-events-none transition-opacity duration-200"
        style={{
          top: 0,
          height: `${pullDistance}px`,
          opacity: pullDistance > 10 ? 1 : 0,
        }}
      >
        <div
          className="bg-primary/10 rounded-full p-2"
          style={{
            transform: refreshing ? "scale(1)" : `scale(${0.5 + progress * 0.5})`,
          }}
        >
          <Loader2
            className={`w-5 h-5 text-primary ${refreshing ? "animate-spin" : ""}`}
            style={{
              transform: refreshing ? "none" : `rotate(${progress * 360}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content with transform */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : "none",
          transition: pulling ? "none" : "transform 0.3s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
