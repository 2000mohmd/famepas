import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, QrCode, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useState } from "react";

const InfluencerBookings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadFor, setUploadFor] = useState<any | null>(null);
  const [platform, setPlatform] = useState("instagram");
  const [contentType, setContentType] = useState("post");
  const [contentUrl, setContentUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, venues(name, city, logo_url), offers(title, offer_type), deliverables(id, status)")
        .eq("influencer_id", user!.id)
        .order("scheduled_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const checkIn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").update({ checked_in_at: new Date().toISOString(), status: "checked_in" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Checked in successfully!" });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });

  const completeBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").update({ completed_at: new Date().toISOString(), status: "completed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Visit marked as completed" });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });

  const resetUpload = () => {
    setUploadFor(null); setPlatform("instagram"); setContentType("post"); setContentUrl(""); setCaption(""); setFile(null);
  };

  const submitContent = async () => {
    if (!uploadFor || !user) return;
    if (!contentUrl.trim() && !file) {
      toast({ title: "Add a post URL or upload a file", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    let mediaUrl: string | null = null;
    try {
      if (file) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/${uploadFor.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("deliverables").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        mediaUrl = path;
      }
      const { error } = await supabase.from("deliverables").insert({
        booking_id: uploadFor.id,
        influencer_id: user.id,
        content_type: contentType,
        platform,
        content_url: contentUrl.trim() || null,
        caption: caption.trim() || null,
        media_url: mediaUrl,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast({ title: "Content submitted", description: "The venue will review and approve it." });
      resetUpload();
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const upcoming = bookings?.filter((b: any) => ["upcoming", "checked_in"].includes(b.status)) ?? [];
  const past = bookings?.filter((b: any) => ["completed", "no_show", "cancelled"].includes(b.status)) ?? [];

  const statusColor = (s: string) => {
    switch (s) {
      case "upcoming": return "bg-blue-500/10 text-blue-500";
      case "checked_in": return "bg-green-500/10 text-green-500";
      case "completed": return "bg-primary/10 text-gold";
      case "no_show": return "bg-red-500/10 text-red-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const renderBooking = (booking: any) => {
    const hasDeliverable = (booking.deliverables ?? []).length > 0;
    const deliverableStatus = booking.deliverables?.[0]?.status;
    return (
    <Card key={booking.id}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{booking.offers?.title || "Visit"}</h3>
              <Badge className={statusColor(booking.status)}>{booking.status.replace("_", " ")}</Badge>
              {hasDeliverable && (
                <Badge variant="outline" className="text-xs">
                  Content: {deliverableStatus}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{booking.venues?.name} • {booking.venues?.city}</p>
            <p className="text-sm text-muted-foreground">📅 {format(new Date(booking.scheduled_date), "PPP p")}</p>
            {booking.checked_in_at && (
              <p className="text-xs text-green-500">Checked in: {format(new Date(booking.checked_in_at), "PPP p")}</p>
            )}
            {booking.deliverable_deadline && (
              <p className="text-xs text-muted-foreground">Deliverable deadline: {format(new Date(booking.deliverable_deadline), "PPP")}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {booking.status === "upcoming" && (
              <Button size="sm" onClick={() => checkIn.mutate(booking.id)}>
                <QrCode className="w-4 h-4 mr-1" /> Check In
              </Button>
            )}
            {booking.status === "checked_in" && (
              <Button size="sm" onClick={() => completeBooking.mutate(booking.id)}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Complete
              </Button>
            )}
            {booking.status === "completed" && !hasDeliverable && (
              <Button size="sm" onClick={() => setUploadFor(booking)}>
                <Upload className="w-4 h-4 mr-1" /> Upload Content
              </Button>
            )}
            {booking.status === "completed" && deliverableStatus === "rejected" && (
              <Button size="sm" variant="outline" onClick={() => setUploadFor(booking)}>
                <Upload className="w-4 h-4 mr-1" /> Resubmit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );};

  return (
    <DashboardLayout type="influencer">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">My Bookings</h1>
          <p className="text-muted-foreground">Manage your scheduled visits</p>
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="space-y-4 mt-4">
            {upcoming.map(renderBooking)}
            {upcoming.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming bookings</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="past" className="space-y-4 mt-4">
            {past.map(renderBooking)}
            {past.length === 0 && <div className="text-center py-12 text-muted-foreground">No past bookings</div>}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!uploadFor} onOpenChange={(o) => { if (!o) resetUpload(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit your content</DialogTitle>
            <DialogDescription>
              Share the link to your post (and optional media file) so the venue can approve it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Content type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Post URL</Label>
              <Input value={contentUrl} onChange={e => setContentUrl(e.target.value)} placeholder="https://instagram.com/p/..." />
            </div>
            <div>
              <Label className="text-xs">Caption (optional)</Label>
              <Textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3} maxLength={2000} />
            </div>
            <div>
              <Label className="text-xs">Upload media (optional)</Label>
              <Input type="file" accept="image/*,video/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button onClick={submitContent} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 mr-1" /> Submit for review</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default InfluencerBookings;
