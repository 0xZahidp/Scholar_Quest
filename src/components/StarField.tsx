import { useEffect, useRef } from "react";

export function StarField({ density = 80 }: { density?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || el.childNodes.length) return;
    for (let i = 0; i < density; i++) {
      const s = document.createElement("span");
      const size = Math.random() * 2 + 0.5;
      s.style.cssText = `
        position:absolute;
        top:${Math.random() * 100}%;
        left:${Math.random() * 100}%;
        width:${size}px;height:${size}px;
        border-radius:9999px;
        background:white;
        opacity:${Math.random() * 0.7 + 0.1};
        animation:twinkle ${3 + Math.random() * 5}s ease-in-out ${Math.random() * 5}s infinite;
        will-change:opacity;
      `;
      el.appendChild(s);
    }
  }, [density]);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    />
  );
}
