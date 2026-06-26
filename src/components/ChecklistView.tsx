import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Trash2, Calendar } from "lucide-react";
import {
  getChecklist, toggleChecklistItem, addChecklistItem, deleteChecklistItem, type ChecklistKind,
} from "@/lib/checklist.functions";

export function ChecklistView({
  kind, title, subtitle, eyebrow,
}: { kind: ChecklistKind; title: string; subtitle: string; eyebrow: string }) {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getChecklist);
  const toggleFn = useServerFn(toggleChecklistItem);
  const addFn = useServerFn(addChecklistItem);
  const delFn = useServerFn(deleteChecklistItem);

  const q = useQuery({ queryKey: ["checklist", kind], queryFn: () => fetchFn({ data: { kind } }) });

  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; status: "todo" | "done" }) => toggleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist", kind] }),
  });
  const addMut = useMutation({
    mutationFn: () => addFn({ data: { kind, title: newTitle, due_date: newDue || undefined } }),
    onSuccess: () => {
      setNewTitle(""); setNewDue("");
      qc.invalidateQueries({ queryKey: ["checklist", kind] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add"),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist", kind] }),
  });

  const rows = q.data ?? [];
  const done = rows.filter((r) => r.status === "done").length;
  const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{eyebrow}</div>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <div className="font-display text-lg font-semibold">{done} / {rows.length} cleared</div>
          <div className="text-sm font-semibold text-primary-glow">{pct}%</div>
        </div>
        <Progress value={pct} className="h-2" />
      </GlassCard>

      <GlassCard delay={0.05}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Add a new task…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newTitle && addMut.mutate()} className="flex-1" />
          <Input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className="sm:w-44" />
          <Button onClick={() => addMut.mutate()} disabled={!newTitle || addMut.isPending}
            className="bg-gradient-to-r from-primary to-accent">
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
      </GlassCard>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              r.status === "done" ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card/40 hover:bg-secondary/30"
            }`}>
            <Checkbox checked={r.status === "done"}
              onCheckedChange={(c) => toggleMut.mutate({ id: r.id, status: c ? "done" : "todo" })} />
            <div className="flex-1">
              <div className={`text-sm ${r.status === "done" ? "line-through opacity-60" : ""}`}>{r.title}</div>
              {r.due_date && (
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" /> due {r.due_date}
                </div>
              )}
            </div>
            <Button size="icon" variant="ghost" onClick={() => delMut.mutate(r.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
