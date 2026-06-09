import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info, Bell, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Tab = "integrations" | "team" | "profile" | "messaging" | "billing" | "compliance";

const tabs: { key: Tab; label: string }[] = [
  { key: "integrations", label: "Integrations" },
  { key: "team", label: "Team" },
  { key: "profile", label: "Profile" },
  { key: "messaging", label: "Messaging" },
  { key: "billing", label: "Billing" },
  { key: "compliance", label: "Compliance" },
];

const VenueSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("integrations");
  const [venueId, setVenueId] = useState<string | null>(null);
  const [venue, setVenue] = useState<any>(null);
  const [socials, setSocials] = useState<any[]>([]);
  const [bookingInt, setBookingInt] = useState<any[]>([]);
  const [igHandle, setIgHandle] = useState("");

  const load = async () => {
    if (!user) return;
    const { data: v } = await supabase.from("venues").select("*").eq("owner_id", user.id).maybeSingle();
    if (!v) return;
    setVenue(v);
    setVenueId(v.id);
    const [sRes, bRes] = await Promise.all([
      supabase.from("social_integrations").select("*").eq("venue_id", v.id),
      supabase.from("booking_platform_integrations").select("*").eq("venue_id", v.id),
    ]);
    setSocials(sRes.data ?? []);
    setBookingInt(bRes.data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const findSocial = (p: string) => socials.find(s => s.platform === p);
  const findBooking = (p: string) => bookingInt.find(b => b.platform === p);

  const connectSocial = async (platform: "instagram" | "tiktok", handle: string) => {
    if (!venueId || !handle) return;
    const { error } = await supabase.from("social_integrations").upsert({
      venue_id: venueId, platform, handle, status: "connected",
    }, { onConflict: "venue_id,platform" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `${platform} connected` }); load(); }
  };

  const disconnectSocial = async (platform: string) => {
    if (!venueId) return;
    await supabase.from("social_integrations").delete().eq("venue_id", venueId).eq("platform", platform);
    toast({ title: "Disconnected" }); load();
  };

  const toggleNotify = async (platform: string) => {
    if (!venueId) return;
    const existing = findBooking(platform);
    if (existing?.status === "notify_me") {
      await supabase.from("booking_platform_integrations").delete().eq("id", existing.id);
    } else {
      await supabase.from("booking_platform_integrations").upsert({
        venue_id: venueId, platform, status: "notify_me",
      }, { onConflict: "venue_id,platform" });
    }
    toast({ title: "Updated" }); load();
  };

  const SocialRow = ({ platform, label, color }: any) => {
    const s = findSocial(platform);
    return (
      <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: color }}>
            {label[0]}
          </div>
          <div>
            <p className="font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{s ? `@${s.handle}` : "Not connected"}</p>
          </div>
        </div>
        {s?.status === "connected" ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "#16a34a" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#16a34a" }} /> Connected
            </span>
            <Button size="sm" variant="ghost" onClick={() => disconnectSocial(platform)}>Disconnect</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input placeholder="@handle" className="w-32 h-9" onChange={e => platform === "instagram" ? setIgHandle(e.target.value) : null} />
            <Button size="sm" onClick={() => connectSocial(platform, platform === "instagram" ? igHandle : "user")} variant="outline">Connect</Button>
          </div>
        )}
      </div>
    );
  };

  const BookingRow = ({ platform, label, color, hasNotify }: any) => {
    const b = findBooking(platform);
    return (
      <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: color }}>
            {label.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{b?.status === "connected" ? "Connected" : b?.status === "notify_me" ? "You'll be notified" : "Not connected"}</p>
          </div>
        </div>
        {hasNotify ? (
          <Button size="sm" variant="outline" onClick={() => toggleNotify(platform)}>
            <Bell className="w-3 h-3 mr-1.5" />
            {b?.status === "notify_me" ? "Notifying" : "Notify me"}
          </Button>
        ) : (
          <Button size="sm" variant="outline">Connect</Button>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <h1 className="text-[28px] font-bold text-foreground mb-6">Settings</h1>

        <div className="flex gap-6 border-b border-border mb-8">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 px-1 text-sm font-medium ${tab === t.key ? "border-b-2 text-foreground" : "text-muted-foreground"}`}
              style={tab === t.key ? { borderColor: "#e8547a" } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "integrations" && (
          <div className="space-y-6">
            <div className="bg-white border border-border rounded-2xl p-6">
              <div className="mb-4">
                <h2 className="font-semibold text-foreground">Social Profiles</h2>
                <p className="text-xs text-muted-foreground">Content tracking and advanced analytics</p>
              </div>
              <SocialRow platform="instagram" label="Instagram" color="#E4405F" />
              <SocialRow platform="tiktok" label="TikTok" color="#000" />
            </div>

            <div className="bg-white border border-border rounded-2xl p-6">
              <div className="mb-4 flex items-center gap-1.5">
                <div>
                  <h2 className="font-semibold text-foreground">Booking Platforms</h2>
                  <p className="text-xs text-muted-foreground">Live availability and instant booking updates</p>
                </div>
                <Info className="w-4 h-4 text-muted-foreground" />
              </div>
              <BookingRow platform="access_collins" label="Access Collins" color="#0ea5e9" />
              <BookingRow platform="resdiary" label="ResDiary" color="#7c3aed" />
              <BookingRow platform="opentable" label="OpenTable" color="#da3743" hasNotify />
              <BookingRow platform="sevenrooms" label="Sevenrooms" color="#1f2937" hasNotify />
            </div>
          </div>
        )}

        {tab === "profile" && venue && (
          <div className="bg-white border border-border rounded-2xl p-6 space-y-4 max-w-2xl">
            <div><Label>Venue name</Label><Input defaultValue={venue.name} /></div>
            <div><Label>City</Label><Input defaultValue={venue.city ?? ""} /></div>
            <div><Label>Email</Label><Input defaultValue={venue.email ?? ""} /></div>
            <Button style={{ background: "#e8547a" }} className="text-white">Save</Button>
          </div>
        )}

        {tab !== "integrations" && tab !== "profile" && (
          <div className="bg-white border border-border rounded-2xl p-16 text-center">
            <p className="text-muted-foreground">{tabs.find(t => t.key === tab)?.label} settings coming soon</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VenueSettings;
