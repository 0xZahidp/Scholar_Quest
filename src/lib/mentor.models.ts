export const DEFAULT_MENTOR_MODEL_ID = "auto";

export const MENTOR_MODEL_OPTIONS = [
  {
    id: "auto",
    provider: "auto",
    model: "",
    label: "Auto",
    description: "Use the first configured provider key.",
  },
  {
    id: "openai-gpt-5-5",
    provider: "openai",
    model: "gpt-5.5",
    label: "GPT 5.5",
    description: "OpenAI flagship mentor model.",
  },
  {
    id: "openai-gpt-5-4",
    provider: "openai",
    model: "gpt-5.4",
    label: "GPT 5.4",
    description: "OpenAI balanced mentor model.",
  },
  {
    id: "openai-gpt-5-4-nano",
    provider: "openai",
    model: "gpt-5.4-nano",
    label: "GPT 5.4 Nano",
    description: "OpenAI lower-cost mentor model.",
  },
  {
    id: "gemini-3-1-pro",
    provider: "gemini",
    model: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro Preview",
    description: "Gemini flagship mentor model.",
  },
  {
    id: "gemini-3-1-flash-lite",
    provider: "gemini",
    model: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    description: "Gemini lower-cost mentor model.",
  },
] as const;

export type MentorModelId = (typeof MENTOR_MODEL_OPTIONS)[number]["id"];
export type MentorProvider = Extract<
  (typeof MENTOR_MODEL_OPTIONS)[number]["provider"],
  "gemini" | "openai"
>;

export const MENTOR_MODEL_IDS = MENTOR_MODEL_OPTIONS.map((option) => option.id);

export function isMentorModelId(value: string): value is MentorModelId {
  return MENTOR_MODEL_IDS.includes(value as MentorModelId);
}

export function getMentorModelOption(id: string | undefined) {
  return MENTOR_MODEL_OPTIONS.find((option) => option.id === id);
}
