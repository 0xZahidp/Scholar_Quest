export type Scholarship = {
  key: string;
  name: string;
  country: string;
  flag: string;
  stipend: string;
  degrees: string[];
  difficulty: number; // 1-10
  ieltsMin: number;
  deadline: string;
  tagline: string;
};

export const SCHOLARSHIPS: Scholarship[] = [
  { key: "erasmus", name: "Erasmus Mundus", country: "EU", flag: "🇪🇺", stipend: "€1,400/mo", degrees: ["Master's"], difficulty: 8, ieltsMin: 6.5, deadline: "2026-02-15", tagline: "Study across multiple European universities." },
  { key: "daad", name: "DAAD", country: "Germany", flag: "🇩🇪", stipend: "€934/mo", degrees: ["Master's", "PhD"], difficulty: 7, ieltsMin: 6.5, deadline: "2026-10-15", tagline: "Germany's flagship academic exchange." },
  { key: "mext", name: "MEXT", country: "Japan", flag: "🇯🇵", stipend: "¥143,000/mo", degrees: ["Bachelor's", "Master's", "PhD"], difficulty: 9, ieltsMin: 6.0, deadline: "2026-05-30", tagline: "Fully-funded by the Japanese government." },
  { key: "gks", name: "Global Korea Scholarship", country: "South Korea", flag: "🇰🇷", stipend: "₩900,000/mo", degrees: ["Bachelor's", "Master's", "PhD"], difficulty: 8, ieltsMin: 5.5, deadline: "2026-03-10", tagline: "Korea's premier government scholarship." },
  { key: "csc", name: "Chinese Government Scholarship (CSC)", country: "China", flag: "🇨🇳", stipend: "¥3,500/mo", degrees: ["Bachelor's", "Master's", "PhD"], difficulty: 6, ieltsMin: 6.0, deadline: "2026-04-01", tagline: "Full tuition + stipend across 280+ universities." },
  { key: "turkiye", name: "Türkiye Bursları", country: "Türkiye", flag: "🇹🇷", stipend: "₺3,500/mo", degrees: ["Bachelor's", "Master's", "PhD"], difficulty: 7, ieltsMin: 6.0, deadline: "2026-02-20", tagline: "All-inclusive Turkish state scholarship." },
  { key: "stipendium", name: "Stipendium Hungaricum", country: "Hungary", flag: "🇭🇺", stipend: "€130/mo + tuition", degrees: ["Bachelor's", "Master's", "PhD"], difficulty: 6, ieltsMin: 5.5, deadline: "2026-01-15", tagline: "Affordable EU degree fully funded." },
  { key: "fulbright", name: "Fulbright", country: "USA", flag: "🇺🇸", stipend: "$2,500/mo", degrees: ["Master's", "PhD"], difficulty: 10, ieltsMin: 7.0, deadline: "2026-05-15", tagline: "The world's most prestigious exchange." },
  { key: "commonwealth", name: "Commonwealth Scholarship", country: "UK", flag: "🇬🇧", stipend: "£1,400/mo", degrees: ["Master's", "PhD"], difficulty: 9, ieltsMin: 6.5, deadline: "2026-11-01", tagline: "For high-impact future leaders." },
  { key: "chevening", name: "Chevening", country: "UK", flag: "🇬🇧", stipend: "£1,400/mo", degrees: ["Master's"], difficulty: 10, ieltsMin: 6.5, deadline: "2026-11-05", tagline: "UK government's flagship global award." },
];

export const COUNTRIES = [
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "OTHER", name: "Other", flag: "🌍" },
];

export const TARGET_COUNTRIES = [
  "🇩🇪 Germany", "🇯🇵 Japan", "🇰🇷 South Korea", "🇺🇸 USA", "🇬🇧 UK",
  "🇨🇦 Canada", "🇦🇺 Australia", "🇳🇱 Netherlands", "🇸🇪 Sweden", "🇫🇷 France",
  "🇨🇳 China", "🇹🇷 Türkiye", "🇭🇺 Hungary", "🇫🇮 Finland", "🇨🇭 Switzerland",
];

export const FIELDS = [
  "Artificial Intelligence", "Data Science", "Cybersecurity", "Computer Science",
  "Engineering", "Business", "Economics", "Public Policy", "Medicine",
  "Biotechnology", "Environmental Science", "Architecture", "Education", "Law",
];
