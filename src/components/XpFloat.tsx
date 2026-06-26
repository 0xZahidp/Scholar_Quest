import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { subscribeXp } from "./xp-float-bus";

export function XpFloatHost() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<{ id: number; xp: number; x: number }[]>([]);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    const fn = (xp: number) => {
      const id = Date.now() + Math.random();
      setItems((p) => [...p, { id, xp, x: 50 + (Math.random() * 30 - 15) }]);
      setTimeout(() => setItems((p) => p.filter((i) => i.id !== id)), 1700);
    };
    return subscribeXp(fn);
  }, []);
  if (!mounted) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[200] flex justify-center">
      {items.map((i) => (
        <div
          key={i.id}
          className="animate-float-up absolute font-display text-2xl font-bold text-gradient drop-shadow-[0_0_10px_oklch(0.62_0.22_280_/_0.8)]"
          style={{ left: `${i.x}%` }}
        >
          +{i.xp} XP
        </div>
      ))}
    </div>,
    document.body,
  );
}
