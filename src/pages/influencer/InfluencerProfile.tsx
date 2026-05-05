import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Save, Camera } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

const InfluencerProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    phone: "",
    instagram_handle: "",
    tiktok_handle: "",
    followers_count: 0,
    tiktok_followers: 0,
    niche: [] as string[],
    avatar_url: "",
    cover_image_url: "",
    city: "",
    country: "",
  });
  const [nicheInput, setNicheInput] = useState("");
  const [locations, setLocations] = useState<{ id: string; city: string; country: string | null }[]>([]);
  const [nicheOptions, setNicheOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from("service_locations").select("id, city, country").eq("is_active", true).order("city").then(({ data }) => {
      setLocations((data as any[]) ?? []);
    });
    supabase.from("niches" as any).select("id, name").eq("is_active", true).order("name").then(({ data }) => {
      setNicheOptions((data as any[]) ?? []);
    });
  }, []);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        phone: profile.phone || "",
        instagram_handle: profile.instagram_handle || "",
        tiktok_handle: profile.tiktok_handle || "",
        followers_count: profile.followers_count || 0,
        tiktok_followers: profile.tiktok_followers || 0,
        niche: profile.niche || [],
        avatar_url: profile.avatar_url || "",
        cover_image_url: (profile as any).cover_image_url || "",
        city: (profile as any).city || "",
        country: (profile as any).country || "",
      });
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const url = `${publicUrl}?t=${Date.now()}`;
      setForm(f => ({ ...f, avatar_url: url }));
      await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast({ title: "Avatar updated!" });
    }
    setAvatarUploading(false);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setCoverUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/cover.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const url = `${publicUrl}?t=${Date.now()}`;
      setForm(f => ({ ...f, cover_image_url: url }));
      await supabase.from("profiles").update({ cover_image_url: url } as any).eq("user_id", user.id);
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast({ title: "Cover updated!" });
    }
    setCoverUploading(false);
  };

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(form as any).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profile updated!" });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      const redirect = searchParams.get("redirect");
      if (redirect) navigate(redirect);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addNiche = () => {
    if (nicheInput.trim() && !form.niche.includes(nicheInput.trim())) {
      setForm({ ...form, niche: [...form.niche, nicheInput.trim()] });
      setNicheInput("");
    }
  };

  const removeNiche = (n: string) => setForm({ ...form, niche: form.niche.filter((x) => x !== n) });

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground">Manage your influencer profile</p>
          </div>
          <div className="flex items-center gap-2">
            {profile?.is_verified && <Badge className="bg-green-500/10 text-green-500"><Shield className="w-3 h-3 mr-1" /> Verified</Badge>}
            {profile?.badge && <Badge variant="outline" className="capitalize">{profile.badge}</Badge>}
          </div>
        </div>

        {/* Cover */}
        <Card>
          <CardHeader><CardTitle>Cover Image</CardTitle></CardHeader>
          <CardContent>
            <div className="relative h-36 overflow-hidden rounded-lg border border-border bg-secondary flex items-center justify-center">
              {form.cover_image_url ? (
                <img src={form.cover_image_url} alt="Profile cover" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm text-muted-foreground">Add a cover image</span>
              )}
              <label className="absolute right-3 bottom-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" disabled={coverUploading} />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Avatar */}
        <Card>
          <CardHeader><CardTitle>Profile Photo</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border bg-secondary flex items-center justify-center">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl text-muted-foreground">{(form.full_name || "?")[0]?.toUpperCase()}</span>
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                  <Camera className="w-4 h-4" />
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={avatarUploading} />
                </label>
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">{form.full_name || "Your Name"}</p>
                <p className="text-xs text-muted-foreground">{avatarUploading ? "Uploading..." : "Click the camera icon to change photo"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Personal Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>City</Label>
                <select
                  value={form.city}
                  onChange={(e) => {
                    const city = e.target.value;
                    const loc = locations.find(l => l.city === city);
                    setForm({ ...form, city, country: loc?.country || form.country });
                  }}
                  className="w-full rounded-md bg-background border border-border p-2 text-sm text-foreground"
                >
                  <option value="">Select city</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.city}>{l.city}{l.country ? ` (${l.country})` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={form.country} readOnly placeholder="Auto from city" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Social Accounts</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Instagram Handle</Label>
                <Input value={form.instagram_handle} onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })} placeholder="@handle" />
              </div>
              <div className="space-y-2">
                <Label>Instagram Followers</Label>
                <Input type="number" value={form.followers_count} onChange={(e) => setForm({ ...form, followers_count: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>TikTok Handle</Label>
                <Input value={form.tiktok_handle} onChange={(e) => setForm({ ...form, tiktok_handle: e.target.value })} placeholder="@handle" />
              </div>
              <div className="space-y-2">
                <Label>TikTok Followers</Label>
                <Input type="number" value={form.tiktok_followers} onChange={(e) => setForm({ ...form, tiktok_followers: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Niches</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <select
                value={nicheInput}
                onChange={(e) => setNicheInput(e.target.value)}
                className="flex-1 rounded-md bg-background border border-border p-2 text-sm text-foreground"
              >
                <option value="">Select a niche...</option>
                {nicheOptions.filter(n => !form.niche.includes(n.name)).map(n => (
                  <option key={n.id} value={n.name}>{n.name}</option>
                ))}
              </select>
              <Button variant="outline" onClick={addNiche} disabled={!nicheInput}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.niche.map((n) => (
                <Badge key={n} variant="secondary" className="cursor-pointer" onClick={() => removeNiche(n)}>{n} ×</Badge>
              ))}
              {form.niche.length === 0 && <p className="text-xs text-muted-foreground">No niches selected yet</p>}
            </div>
          </CardContent>
        </Card>

        <Button className="w-full" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
          <Save className="w-4 h-4 mr-2" /> {updateProfile.isPending ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default InfluencerProfile;
