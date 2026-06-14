import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Plus, Minus, X, Image as ImageIcon, Info, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Deliverable = {
  media_type: "video" | "image";
  format: "9:16" | "4:5" | "1:1" | "16:9";
  creative_direction: string;
  references: string[];
  quantity: number;
};

const PINK = "#e8547a";
const newDeliverable = (): Deliverable => ({
  media_type: "video",
  format: "9:16",
  creative_direction: "",
  references: [],
  quantity: 1,
});

const FORMATS: { v: Deliverable["format"]; label: string }[] = [
  { v: "9:16", label: "Vertical" },
  { v: "4:5", label: "Vertical" },
  { v: "1:1", label: "Square" },
  { v: "16:9", label: "Landscape" },
];

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white border border-border rounded-2xl p-6 mb-5">
    <h2 className="text-lg font-bold text-foreground border-b-2 pb-2 mb-5 inline-block" style={{ borderColor: PINK }}>{title}</h2>
    {children}
  </div>
);

const VenueBriefCreate = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = !!id;

  const [venue, setVenue] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [locationId, setLocationId] = useState("");
  const [deliverables, setDeliverables] = useState<Deliverable[]>([newDeliverable()]);
  const [refInput, setRefInput] = useState<Record<number, string>>({});

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: vs } = await supabase
        .from("venues").select("*").eq("owner_id", user.id)
        .order("created_at", { ascending: true });
      const list = vs ?? [];
      if (!list.length) return;
      setVenue(list[0]);
      setLocations(list);

      if (editing && id) {
        const { data: b }: any = await supabase.from("venue_briefs").select("*").eq("id", id).maybeSingle();
        if (b) {
          setName(b.title ?? "");
          setDeadline(b.deadline ? new Date(b.deadline).toISOString().slice(0, 10) : "");
          setDescription(b.description ?? "");
          setCoverUrl(b.cover_image_url ?? b.image_url ?? "");
          setLocationId(b.location_id ?? "");
          if (Array.isArray(b.deliverables_spec) && b.deliverables_spec.length)
            setDeliverables(b.deliverables_spec);
        }
      }
    })();
  }, [user, id, editing]);

  const uploadCover = async (file: File) => {
    if (!venue) return;
    setUploading(true);
    const path = `${venue.id}/briefs/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("brief-images").upload(path, file, { upsert: true });
    setUploading(false);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return; }
    setCoverUrl(supabase.storage.from("brief-images").getPublicUrl(path).data.publicUrl);
  };

  const updateD = (i: number, patch: Partial<Deliverable>) => {
    const next = [...deliverables];
    next[i] = { ...next[i], ...patch };
    setDeliverables(next);
  };

  const addReference = (i: number) => {
    const v = (refInput[i] || "").trim();
    if (!v) return;
    updateD(i, { references: [...deliverables[i].references, v] });
    setRefInput({ ...refInput, [i]: "" });
  };

  const removeReference = (i: number, j: number) => {
    updateD(i, { references: deliverables[i].references.filter((_, k) => k !== j) });
  };

  const save = async (mode: "draft" | "live") => {
    if (!venue) return;
    if (!name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    const payload: any = {
      venue_id: venue.id,
      title: name,
      description: description || " ",
      deadline: deadline ? new Date(deadline).toISOString() : null,
      cover_image_url: coverUrl || null,
      image_url: coverUrl || null,
      location_id: locationId || null,
      deliverables_spec: deliverables,
      pipeline_stage: mode === "draft" ? "draft" : "matching",
      status: mode === "draft" ? "open" : "open",
      is_active: mode === "live",
    };
    const { error } = editing
      ? await supabase.from("venue_briefs").update(payload).eq("id", id!)
      : await supabase.from("venue_briefs").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: mode === "draft" ? "Saved to drafts" : "Brief is live" });
    navigate("/venue/briefs");
  };

  return (
    <DashboardLayout type="venue">
      <div className="max-w-3xl mx-auto pb-28 animate-fade-in">
        <button onClick={() => navigate("/venue/briefs")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <Section title="Content Brief">
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-semibold">Name</Label>
              <p className="text-xs text-muted-foreground mb-2">Max 50 characters</p>
              <Input maxLength={50} value={name} onChange={e => setName(e.target.value)} placeholder="Name your brief..." />
            </div>

            <div>
              <Label className="text-sm font-semibold">Deadline</Label>
              <p className="text-xs text-muted-foreground mb-2">All deliverables to be uploaded and approved by this date</p>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="pl-9" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Label className="text-sm font-semibold">Description</Label>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">A short statement explaining your brand or campaign objective</p>
              <Textarea maxLength={1000} rows={5} value={description} onChange={e => setDescription(e.target.value)} placeholder="Write a short description..." />
              <p className="text-right text-xs text-muted-foreground mt-1">{description.length}/1000</p>
            </div>

            <div>
              <Label className="text-sm font-semibold">Cover Image</Label>
              <p className="text-xs text-muted-foreground mb-2">Upload a cover image for your brief {uploading && <span className="text-[#e8547a]">(uploading…)</span>}</p>
              <label className="block w-full h-40 border border-dashed border-border rounded-xl cursor-pointer overflow-hidden relative hover:border-[#e8547a]">
                {coverUrl ? (
                  <>
                    <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={(e) => { e.preventDefault(); setCoverUrl(""); }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"><X className="w-4 h-4" /></button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                    <ImageIcon className="w-6 h-6" /> Choose cover image
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadCover(e.target.files[0])} />
              </label>
            </div>

            <div>
              <Label className="text-sm font-semibold">Locations</Label>
              <p className="text-xs text-muted-foreground mb-2">Where will the creator need to shoot the content</p>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger><SelectValue placeholder="Select a location" /></SelectTrigger>
                <SelectContent>
                  {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {venue && (
              <div className="bg-muted/40 border border-border rounded-xl p-4 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">About {venue.name}</p>
                  <p className="text-xs text-muted-foreground">{venue.description || "No description provided"}</p>
                </div>
                <Info className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        </Section>

        <Section title="Deliverables">
          {deliverables.map((d, i) => (
            <div key={i} className="bg-muted/30 border border-border rounded-xl p-4 mb-4 relative">
              {deliverables.length > 1 && (
                <button onClick={() => setDeliverables(deliverables.filter((_, k) => k !== i))} className="absolute top-3 right-3 text-muted-foreground hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              )}

              <Label className="text-sm font-semibold">Media Type</Label>
              <div className="grid grid-cols-2 gap-3 mt-2 mb-5">
                {[
                  { v: "video", label: "Video", credits: "1 credit" },
                  { v: "image", label: "Image", credits: "0.25 credits" },
                ].map(opt => {
                  const on = d.media_type === opt.v;
                  return (
                    <button key={opt.v} type="button" onClick={() => updateD(i, { media_type: opt.v as any })}
                      className={`text-left p-3 rounded-xl border ${on ? "border-[#e8547a] bg-pink-50/50" : "border-border"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full border-2 ${on ? "border-[#e8547a]" : "border-border"} flex items-center justify-center`}>
                          {on && <span className="w-1.5 h-1.5 rounded-full bg-[#e8547a]" />}
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.credits}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <Label className="text-sm font-semibold">Format</Label>
              <div className="grid grid-cols-4 gap-2 mt-2 mb-5">
                {FORMATS.map(f => {
                  const on = d.format === f.v;
                  return (
                    <button key={f.v} type="button" onClick={() => updateD(i, { format: f.v })}
                      className={`p-3 rounded-xl border text-center ${on ? "border-[#e8547a] bg-pink-50/50" : "border-border"}`}>
                      <div className={`mx-auto mb-1 border-2 ${on ? "border-[#e8547a]" : "border-muted-foreground"}`}
                        style={{
                          width: f.v === "16:9" ? 22 : f.v === "1:1" ? 16 : 12,
                          height: f.v === "16:9" ? 12 : f.v === "4:5" ? 18 : f.v === "1:1" ? 16 : 20,
                        }} />
                      <p className="text-xs font-semibold">{f.v}</p>
                      <p className="text-[10px] text-muted-foreground">{f.label}</p>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 mb-1">
                <Label className="text-sm font-semibold">Creative Direction</Label>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">What should and shouldn't be included in the content?</p>
              <Textarea
                maxLength={2000} rows={4}
                value={d.creative_direction}
                onChange={e => updateD(i, { creative_direction: e.target.value })}
                placeholder="What needs to be captured..."
              />
              <p className="text-right text-xs text-muted-foreground mt-1 mb-5">{d.creative_direction.length}/2000</p>

              <Label className="text-sm font-semibold">References</Label>
              <p className="text-xs text-muted-foreground mb-2">Add examples that illustrate the style you're going for (make sure links are publicly accessible)</p>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="https://..."
                  value={refInput[i] || ""}
                  onChange={e => setRefInput({ ...refInput, [i]: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addReference(i))}
                />
                <Button type="button" variant="outline" onClick={() => addReference(i)}>+ Add Reference</Button>
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {d.references.map((r, j) => (
                  <span key={j} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-[#e8547a] text-xs max-w-xs truncate">
                    {r}
                    <button onClick={() => removeReference(i, j)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>

              <Label className="text-sm font-semibold">Quantity</Label>
              <div className="inline-flex items-center gap-1 border border-border rounded-lg mt-2">
                <button onClick={() => updateD(i, { quantity: Math.max(1, d.quantity - 1) })} className="px-3 py-1.5"><Minus className="w-3 h-3" /></button>
                <span className="w-8 text-center text-sm">{d.quantity}</span>
                <button onClick={() => updateD(i, { quantity: d.quantity + 1 })} className="px-3 py-1.5"><Plus className="w-3 h-3" /></button>
              </div>
            </div>
          ))}

          <button
            onClick={() => setDeliverables([...deliverables, newDeliverable()])}
            className="w-full py-3 rounded-xl border border-dashed border-border flex items-center justify-center gap-2 text-sm font-medium hover:border-[#e8547a] hover:text-[#e8547a]"
          >
            <Plus className="w-4 h-4" /> Add another deliverable
          </button>
        </Section>
      </div>

      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-border px-8 py-3 flex items-center justify-between z-30">
        <Button variant="outline">Preview</Button>
        <div className="flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="w-4 h-4 rounded-full border border-muted-foreground inline-block" /> 0 credits
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save("draft")} disabled={saving}>Save Draft</Button>
          <Button onClick={() => save("live")} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">▶ Set Live</Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VenueBriefCreate;
