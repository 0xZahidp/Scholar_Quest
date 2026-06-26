export const LEVELS = [
  { level: 1, title: "Dreamer", xp: 0 },
  { level: 2, title: "Explorer", xp: 500 },
  { level: 3, title: "Applicant", xp: 1500 },
  { level: 4, title: "Rising Scholar", xp: 3500 },
  { level: 5, title: "Global Candidate", xp: 7000 },
  { level: 6, title: "Scholarship Finalist", xp: 13000 },
  { level: 7, title: "Scholarship Winner", xp: 22000 },
  { level: 8, title: "Future Researcher", xp: 35000 },
  { level: 9, title: "Global Professional", xp: 52000 },
  { level: 10, title: "International Success", xp: 75000 },
];

export function levelFromXp(xp: number) {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? LEVELS[i];
    }
  }
  const span = next.xp - current.xp || 1;
  const progress = Math.min(100, Math.round(((xp - current.xp) / span) * 100));
  return { current, next, progress, xp };
}

export const XP_REWARDS = {
  daily_login: 25,
  task_complete: 50,
  passport_created: 100,
  linkedin_created: 75,
  github_created: 75,
  cv_uploaded: 150,
  sop_drafted: 300,
  ielts_registered: 500,
  ielts_mock: 200,
  band_7: 1000,
  document_uploaded: 50,
  scholarship_researched: 100,
  scholarship_applied: 750,
  university_submitted: 500,
  professor_emailed: 150,
  budget_milestone: 200,
  visa_approved: 3000,
  scholarship_won: 5000,
} as const;
