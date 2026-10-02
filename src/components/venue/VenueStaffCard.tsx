import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { QrCode, X } from "lucide-react";

const db = supabase as any;

interface Staff { user_id: string; full_name: string | null }

/**
 * Scan-only logins for whoever works the door. They can check creators in and
 * nothing else — no bookings list, offers or settings.
 */
const VenueStaffCard = ({ venueId }: { venueId: string }) => {
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await db.from("venue_staff").select("user_id").eq("venue_id", venueId);
    const ids = (data ?? []).map((s: any) => s.user_id);
    if (!ids.length) { setStaff([]); return; }
    const { data: names } = await supabase.rpc("get_public_profiles_basic", { _user_ids: ids });
    const byId = new Map((names ?? []).map((n: any) => [n.user_id, n.full_name]));
    setStaff(ids.map((id: string) => ({ user_id: id, full_name: byId.get(id) ?? null })));
  };

  useEffect(() => { void load(); }, [venueId]);

  const add = async () => {
    if (!form.full_name.trim() || !form.email.trim() || form.password.length < 8) {
      toast({ title: "Add a name, an email and a password of at least 8 characters", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("create-venue-staff", {
      body: { venue_id: venueId, ...form },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast({ title: "Couldn't add them", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: `${form.full_name} can now sign in and scan`, description: "Send them the email and password privately." });
    setForm({ full_name: "", email: "", password: "" });
    void load();
  };

  const remove = async (userId: string) => {
    // Removing the link is enough: the scan check requires an active row for
    // this venue, so their login stops working here immediately.
    const { error } = await db.from("venue_staff").delete().eq("venue_id", venueId).eq("user_id", userId);
    if (error) { toast({ title: "Couldn't remove", description: error.message, variant: "destructive" }); return; }
    void load();
  };

  return (
    <div className="bg-white border border-border rounded-2xl p-6 max-w-3xl mt-6">
      <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
        <QrCode className="w-4 h-4" /> Door staff
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Logins for your cashier or host to check creators in. They can only scan — they can't see your bookings, offers or settings.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <Input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input placeholder="Password (8+ characters)" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>
      <Button onClick={() => void add()} disabled={saving}>{saving ? "Adding…" : "Add door staff"}</Button>

      <div className="border-t border-border mt-5 pt-4 space-y-2">
        {staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">No door staff yet — you can scan from your own account.</p>
        ) : staff.map((s) => (
          <div key={s.user_id} className="flex items-center justify-between">
            <span className="text-foreground">{s.full_name || "Unnamed"}</span>
            <Button size="icon" variant="ghost" onClick={() => void remove(s.user_id)} aria-label={`Remove ${s.full_name}`}>
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VenueStaffCard;
