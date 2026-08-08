"use client";

import { motion } from "framer-motion";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "success" | "error";

export function AIOrb({ state = "idle", size = "large", level = 0.3 }: { state?: OrbState; size?: "small" | "large"; level?: number }) {
  const listening = state === "listening" || state === "speaking";
  return (
    <div className={`ai-orb ai-orb--${size} ai-orb--${state}`} style={{ "--level": level } as React.CSSProperties} aria-label={`AI orb is ${state}`}>
      {listening && <><span className="orb-wave orb-wave--one" /><span className="orb-wave orb-wave--two" /><span className="orb-wave orb-wave--three" /></>}
      <span className="orb-aura" />
      <motion.span className="orb-shell" animate={{ scale: listening ? 1 + level * 0.1 : 1, rotate: state === "thinking" ? 360 : 0 }} transition={{ rotate: { repeat: Infinity, duration: 9, ease: "linear" }, scale: { duration: 0.2 } }}>
        <span className="orb-plasma" /><span className="orb-reflection" /><span className="orb-shadow" />
      </motion.span>
      <span className="orb-orbit" />
    </div>
  );
}
