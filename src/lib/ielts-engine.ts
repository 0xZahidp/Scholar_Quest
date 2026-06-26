// ===== IELTS Intelligence Engine — Crown Jewel =====
// Pure math for skill velocity, predicted band trajectory, and time-to-target.

export type IeltsSkill = "listening" | "reading" | "writing" | "speaking";
export const IELTS_SKILLS: IeltsSkill[] = ["listening", "reading", "writing", "speaking"];

export type Mock = {
  id?: string;
  taken_on: string; // YYYY-MM-DD
  listening: number | null;
  reading: number | null;
  writing: number | null;
  speaking: number | null;
  overall: number | null;
};

export type Targets = {
  target_listening: number;
  target_reading: number;
  target_writing: number;
  target_speaking: number;
  target_overall: number;
  exam_date: string | null;
};

export const DEFAULT_TARGETS: Targets = {
  target_listening: 7,
  target_reading: 7,
  target_writing: 7,
  target_speaking: 7,
  target_overall: 7,
  exam_date: null,
};

function daysBetween(a: string, b: string): number {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

function roundBand(v: number): number {
  return Math.round(v * 2) / 2;
}

export function computeOverall(m: Pick<Mock, "listening" | "reading" | "writing" | "speaking">): number | null {
  const skills = [m.listening, m.reading, m.writing, m.speaking];
  if (skills.some((s) => s == null)) return null;
  const avg = (skills as number[]).reduce((a, b) => a + b, 0) / 4;
  return roundBand(avg);
}

// Linear regression slope (band points per week) over a series of (dayOffset, score)
function velocityPerWeek(points: Array<{ day: number; score: number }>): number {
  if (points.length < 2) return 0;
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.day, 0) / n;
  const meanY = points.reduce((s, p) => s + p.score, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.day - meanX) * (p.score - meanY);
    den += (p.day - meanX) ** 2;
  }
  if (den === 0) return 0;
  const slopePerDay = num / den;
  return slopePerDay * 7;
}

export type SkillAnalysis = {
  skill: IeltsSkill | "overall";
  current: number | null;
  target: number;
  delta: number; // target - current
  velocityPerWeek: number;
  weeksToTarget: number | null; // null if at/over target or no velocity
  status: "on_track" | "behind" | "achieved" | "no_data" | "stuck";
  trend: Array<{ date: string; score: number }>;
};

export function analyzeSkill(
  mocks: Mock[],
  skill: IeltsSkill | "overall",
  target: number,
): SkillAnalysis {
  const sorted = [...mocks].sort((a, b) => a.taken_on.localeCompare(b.taken_on));
  const scored = sorted
    .map((m) => ({ date: m.taken_on, score: skill === "overall" ? m.overall : m[skill] }))
    .filter((p): p is { date: string; score: number } => p.score != null);

  if (scored.length === 0) {
    return { skill, current: null, target, delta: target, velocityPerWeek: 0, weeksToTarget: null, status: "no_data", trend: [] };
  }

  const current = scored[scored.length - 1].score;
  const first = scored[0].date;
  const points = scored.map((p) => ({ day: daysBetween(first, p.date), score: p.score }));
  const velocity = velocityPerWeek(points);
  const delta = target - current;

  let status: SkillAnalysis["status"];
  let weeksToTarget: number | null = null;

  if (current >= target) {
    status = "achieved";
  } else if (velocity <= 0.01) {
    status = scored.length >= 2 ? "stuck" : "no_data";
  } else {
    weeksToTarget = Math.ceil(delta / velocity);
    status = weeksToTarget <= 16 ? "on_track" : "behind";
  }

  return { skill, current, target, delta, velocityPerWeek: velocity, weeksToTarget, status, trend: scored };
}

export type IeltsReadiness = {
  overall: SkillAnalysis;
  perSkill: SkillAnalysis[];
  weakest: SkillAnalysis | null;
  readinessPercent: number; // 0-100 toward overall target
  weeksToOverallTarget: number | null;
  daysUntilExam: number | null;
  willMakeExam: boolean | null;
  totalMocks: number;
};

export function analyzeIelts(mocks: Mock[], targets: Targets): IeltsReadiness {
  // Auto-derive overall if missing on rows
  const withOverall = mocks.map((m) => ({
    ...m,
    overall: m.overall ?? computeOverall(m),
  }));

  const perSkill = IELTS_SKILLS.map((s) =>
    analyzeSkill(withOverall, s, targets[`target_${s}` as const] as number),
  );
  const overall = analyzeSkill(withOverall, "overall", targets.target_overall);

  const weakest = [...perSkill].filter((s) => s.current != null).sort((a, b) => {
    // Most behind by delta, tiebreak by lowest velocity
    if (a.delta !== b.delta) return b.delta - a.delta;
    return a.velocityPerWeek - b.velocityPerWeek;
  })[0] ?? null;

  const readinessPercent = overall.current
    ? Math.min(100, Math.round((overall.current / overall.target) * 100))
    : 0;

  const daysUntilExam = targets.exam_date
    ? Math.round((new Date(targets.exam_date).getTime() - Date.now()) / 86400000)
    : null;

  const weeksToOverallTarget = overall.weeksToTarget;
  const willMakeExam =
    daysUntilExam != null && weeksToOverallTarget != null
      ? weeksToOverallTarget * 7 <= daysUntilExam
      : null;

  return {
    overall,
    perSkill,
    weakest,
    readinessPercent,
    weeksToOverallTarget,
    daysUntilExam,
    willMakeExam,
    totalMocks: mocks.length,
  };
}

export function statusColor(status: SkillAnalysis["status"]): string {
  switch (status) {
    case "achieved": return "text-emerald-400";
    case "on_track": return "text-primary-glow";
    case "behind": return "text-amber-400";
    case "stuck": return "text-rose-400";
    default: return "text-muted-foreground";
  }
}

export function statusLabel(status: SkillAnalysis["status"]): string {
  switch (status) {
    case "achieved": return "Target hit";
    case "on_track": return "On track";
    case "behind": return "Behind pace";
    case "stuck": return "Plateaued";
    default: return "Awaiting data";
  }
}
