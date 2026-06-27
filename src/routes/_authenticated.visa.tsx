import { createFileRoute } from "@tanstack/react-router";
import { ChecklistView } from "@/components/ChecklistView";

export const Route = createFileRoute("/_authenticated/visa")({
  head: () => ({ meta: [{ title: "Visa Operations — Scholar Quest" }] }),
  component: () => (
    <ChecklistView
      kind="visa"
      title="Visa Operations"
      subtitle="Mission-critical paperwork. Miss one item, miss the flight."
      eyebrow="Border Clearance"
    />
  ),
});
