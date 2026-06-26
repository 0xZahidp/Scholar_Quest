import { motion } from "framer-motion";

type Props = {
  value: number; // 0-100
  label: string;
  size?: number;
  color?: string;
  sub?: string;
};

export function RadialRing({ value, label, size = 120, color = "var(--color-primary)", sub }: Props) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const offset = c - (v / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="oklch(1 0 0 / 0.07)" strokeWidth={stroke} fill="none" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="font-display text-2xl font-bold">{Math.round(v)}<span className="text-base opacity-60">%</span></div>
            {sub && <div className="text-[10px] uppercase tracking-wider opacity-60">{sub}</div>}
          </div>
        </div>
      </div>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{label}</div>
    </div>
  );
}
