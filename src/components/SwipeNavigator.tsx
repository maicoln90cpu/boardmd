import { useNavigate, useLocation } from "react-router-dom";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useIsMobile } from "@/hooks/ui/useMobile";
import { hapticLight } from "@/lib/haptic";
import { useCallback, useRef } from "react";

const SWIPE_PAGES = ["/", "/notes", "/dashboard", "/calendar"];
const SWIPE_THRESHOLD = 80;

interface SwipeNavigatorProps {
  children: React.ReactNode;
}

export function SwipeNavigator({ children }: SwipeNavigatorProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const isNavigating = useRef(false);

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);

  const currentIndex = SWIPE_PAGES.indexOf(location.pathname);
  const isSwipeable = currentIndex !== -1;

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (!isSwipeable || isNavigating.current) return;

      const { offset, velocity } = info;
      const swipeDistance = Math.abs(offset.x);
      const swipeVelocity = Math.abs(velocity.x);

      if (swipeDistance < SWIPE_THRESHOLD && swipeVelocity < 300) return;

      const direction = offset.x > 0 ? -1 : 1;
      const nextIndex = currentIndex + direction;

      if (nextIndex >= 0 && nextIndex < SWIPE_PAGES.length) {
        isNavigating.current = true;
        hapticLight();
        navigate(SWIPE_PAGES[nextIndex]);
        setTimeout(() => { isNavigating.current = false; }, 300);
      }
    },
    [currentIndex, isSwipeable, navigate]
  );

  if (!isMobile || !isSwipeable) {
    return <>{children}</>;
  }

  return (
    <motion.div
      style={{ x, opacity, touchAction: "pan-y" }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDragEnd={handleDragEnd}
      className="flex-1 flex flex-col min-h-0"
    >
      {children}
    </motion.div>
  );
}
