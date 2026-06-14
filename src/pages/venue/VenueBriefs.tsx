import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { EmptyState, ClipboardIllustration } from "@/components/venue/EmptyState";
import { Plus, Clipboard, Star, Film, CheckCircle2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Stage = "draft" | "matching" | "in_progress" | "review" | "complete";

const VenueBriefs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("draft");
  const [briefs, setBriefs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (!venue) return;
      const { data } = await supabase.from("venue_briefs").select("*").eq("venue_id", venue.id).order("created_at", { ascending: false });
      setBriefs(data ?? []);
    })();
  }, [user]);

  const counts: Record<Stage, number> = {
    draft: briefs.filter(b => (b.pipeline_stage ?? "draft") === "draft").length,
    matching: briefs.filter(b => b.pipeline_stage === "matching").length,
    in_progress: briefs.filter(b => b.pipeline_stage === "in_progress").length,
    review: briefs.filter(b => b.pipeline_stage === "review").length,
    complete: briefs.filter(b => b.pipeline_stage === "complete").length,
  };

  const stages: { key: Stage; label: string; icon: any }[] = [
    { key: "draft", label: "Drafts", icon: Clipboard },
    { key: "matching", label: "Matching", icon: Star },
    { key: "in_progress", label: "In Progress", icon: Film },
    { key: "review", label: "Review", icon: CheckCircle2 },
    { key: "complete", label: "Complete", icon: Check },
  ];

  const filtered = briefs.filter(b => (b.pipeline_stage ?? "draft") === stage);

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-[28px] font-bold text-foreground">Briefs</h1>
            <a href="#" className="text-sm font-medium" style={{ color: "#e8547a" }}>How does it work?</a>
          </div>
          <Button onClick={() => navigate("/venue/briefs/new")} style={{ background: "#e8547a" }} className="text-white hover:opacity-90">
            <Plus className="w-4 h-4 mr-1.5" /> New Brief
          </Button>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-8">
          {stages.map(s => {
            const Icon = s.icon;
            const isActive = stage === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setStage(s.key)}
                className={`bg-white border rounded-xl p-4 text-left transition-all ${isActive ? "border-2" : "border-border hover:border-pink-200"}`}
                style={isActive ? { borderColor: "#e8547a" } : undefined}
              >
                <Icon className="w-5 h-5 mb-2" style={{ color: isActive ? "#e8547a" : "#94a3b8" }} />
                <p className="text-sm font-semibold text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{counts[s.key]} items</p>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardIllustration />}
            title="Start here or pick up where you left off"
            description="Create your first brief or jump back into your drafts"
            action={<Button onClick={() => navigate("/venue/briefs/new")} style={{ background: "#e8547a" }} className="text-white hover:opacity-90"><Plus className="w-4 h-4 mr-1.5" /> Create a brief</Button>}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map(b => (
              <div key={b.id} className="bg-white border border-border rounded-xl p-4">
                <p className="font-medium text-foreground">{b.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{b.description?.slice(0, 120)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VenueBriefs;
