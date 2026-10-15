import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Up to 9 photos of a creator's work (creator_portfolio table, files in the
 * public "avatars" bucket under <user_id>/portfolio/). Editable on the
 * creator's own profile, read-only on the venue-facing one. Stands in for
 * Instagram media until Meta App Review lets us read it.
 */
export const PORTFOLIO_MAX = 9;
type Item = { id: string; image_url: string; position: number };

export const usePortfolio = (userId: string | undefined) =>
  useQuery({
    queryKey: ["creator-portfolio", userId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("creator_portfolio").select("id, image_url, position")
        .eq("user_id", userId).order("position").order("created_at");
      return (data ?? []) as Item[];
    },
    enabled: !!userId,
  });

const CreatorPortfolio = ({ userId, editable = false }: { userId: string; editable?: boolean }) => {
  const { data: items = [], isLoading } = usePortfolio(userId);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["creator-portfolio", userId] });

  const upload = async (files: FileList | null) => {
    const room = PORTFOLIO_MAX - items.length;
    const picked = Array.from(files ?? []).filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (!picked.length) return;
    const tooBig = picked.find((f) => f.size > 8 * 1024 * 1024);
    if (tooBig) { toast({ title: "Photo too large", description: `${tooBig.name} is over 8 MB.`, variant: "destructive" }); return; }
    setUploading(true);
    let pos = items.reduce((m, i) => Math.max(m, i.position), 0);
    for (const file of picked) {
      const path = `${userId}/portfolio/${crypto.randomUUID()}.${(file.name.split(".").pop() || "jpg").toLowerCase()}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
      if (upErr) { toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); break; }
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await (supabase as any).from("creator_portfolio").insert({ user_id: userId, image_url: publicUrl, position: ++pos });
      if (error) {
        await supabase.storage.from("avatars").remove([path]);
        toast({ title: "Couldn't add photo", description: error.message, variant: "destructive" });
        break;
      }
    }
    setUploading(false);
    refresh();
  };

  const remove = async (item: Item) => {
    const { error } = await (supabase as any).from("creator_portfolio").delete().eq("id", item.id);
    if (error) { toast({ title: "Couldn't remove photo", description: error.message, variant: "destructive" }); return; }
    const path = item.image_url.split("/object/public/avatars/")[1];
    if (path) await supabase.storage.from("avatars").remove([decodeURIComponent(path)]);
    refresh();
  };

  if (isLoading) return <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />)}</div>;
  if (!editable && items.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.id} className="relative aspect-square rounded-2xl overflow-hidden bg-muted group">
            <button type="button" onClick={() => setOpen(item.image_url)} className="block w-full h-full" aria-label="Open photo">
              <img src={item.image_url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300" />
            </button>
            {editable && (
              <button type="button" onClick={() => remove(item)} aria-label="Remove photo"
                className="absolute right-2 top-2 w-9 h-9 rounded-full bg-black/50 backdrop-blur text-white flex items-center justify-center opacity-90 hover:bg-black/70 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {editable && items.length < PORTFOLIO_MAX && (
          <label className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-sm font-semibold text-muted-foreground cursor-pointer hover:border-primary hover:text-foreground transition">
            <ImagePlus className="w-6 h-6" />
            {uploading ? "Uploading…" : "Add photos"}
            <span className="text-xs font-normal">{items.length}/{PORTFOLIO_MAX}</span>
            <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </div>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Photo" onClick={() => setOpen(null)} className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" className="absolute right-4 top-4 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"><X className="w-5 h-5" /></button>
          <img src={open} alt="" className="max-w-full max-h-full rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
};

export default CreatorPortfolio;
