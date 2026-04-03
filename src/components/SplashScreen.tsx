import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase("hold"), 600);
    const exitTimer = setTimeout(() => setPhase("exit"), 1800);
    const doneTimer = setTimeout(() => onComplete(), 2400);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "exit" ? null : null}
      <motion.div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
        style={{
          background: "linear-gradient(135deg, hsl(262 83% 30%), hsl(262 83% 58%), hsl(280 70% 50%))",
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === "exit" ? 0 : 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        onAnimationComplete={() => {
          if (phase === "exit") onComplete();
        }}
      >
        {/* Mountain Logo */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M50 15L85 80H15L50 15Z"
              fill="white"
              fillOpacity="0.95"
            />
            <path
              d="M50 15L65 50L55 40L50 45L45 40L35 50L50 15Z"
              fill="white"
              fillOpacity="0.3"
            />
            <path
              d="M38 60L50 38L62 60"
              stroke="white"
              strokeOpacity="0.2"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </motion.div>

        {/* App Name */}
        <motion.h1
          className="mt-4 text-4xl font-bold tracking-wider text-white"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
        >
          Zenit
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="mt-2 text-sm text-white/70 tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          Eleve seu foco. Alcance o Zenit.
        </motion.p>

        {/* Subtle pulse ring */}
        <motion.div
          className="absolute rounded-full border border-white/10"
          style={{ width: 200, height: 200 }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.8, 1.2, 1.5], opacity: [0.3, 0.15, 0] }}
          transition={{ duration: 2, ease: "easeOut", delay: 0.4 }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
