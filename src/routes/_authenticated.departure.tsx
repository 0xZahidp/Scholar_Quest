import { createFileRoute } from "@tanstack/react-router";
import { ChecklistView } from "@/components/ChecklistView";

export const Route = createFileRoute("/_authenticated/departure")({
  head: () => ({ meta: [{ title: "Departure Sequence — Scholar Quest" }] }),
  component: () => (
    <ChecklistView
      kind="departure"
      title="Departure Sequence"
      subtitle="Last 60 days. Pack, ship, fly."
      eyebrow="Launch Window"
    />
  ),
});
