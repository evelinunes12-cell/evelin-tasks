import { useEffect, useState } from "react";

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Small delay to ensure the CSS transition triggers
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className="transition-all duration-300 ease-out"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(8px)",
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
