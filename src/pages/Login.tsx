import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import famepassLogo from "@/assets/famepass-logo.jpeg";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, role, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user && role) {
      if (role === "admin") navigate("/admin", { replace: true });
      else if (role === "venue") navigate("/venue", { replace: true });
      else navigate("/", { replace: true });
    }
  }, [user, role, navigate]);

  // Signup state
  const [signupRole, setSignupRole] = useState<"venue" | "influencer">("influencer");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  // Influencer fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [tiktokFollowers, setTiktokFollowers] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  // Venue fields
  const [venueName, setVenueName] = useState("");
  const [venueCategory, setVenueCategory] = useState("");
  const [venueCity, setVenueCity] = useState("");

  // Dynamic categories and locations
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; city: string }[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      const [catRes, locRes] = await Promise.all([
        supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
        supabase.from("service_locations").select("id, city").eq("is_active", true).order("city"),
      ]);
      setCategories((catRes.data as any[]) ?? []);
      setLocations((locRes.data as any[]) ?? []);
    };
    fetchOptions();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const body: any = {
        email: signupEmail,
        password: signupPassword,
        role: signupRole,
      };
      if (signupRole === "influencer") {
        body.full_name = fullName;
        body.phone = phone;
        body.instagram_handle = instagramHandle;
        body.tiktok_handle = tiktokHandle;
        body.tiktok_followers = parseInt(tiktokFollowers) || 0;
        body.social_links = {
          instagram: instagramHandle ? `https://instagram.com/${instagramHandle}` : "",
          tiktok: tiktokHandle ? `https://tiktok.com/@${tiktokHandle}` : "",
          youtube: youtubeLink || "",
        };
      } else {
        body.venue_name = venueName;
        body.venue_category = venueCategory;
        body.venue_city = venueCity;
      }

      const res = await supabase.functions.invoke("signup-user", { body });
      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || "Signup failed");
      }

      // Auto-login
      const { error: loginErr } = await signIn(signupEmail, signupPassword);
      if (loginErr) {
        toast({ title: "Account created! Please sign in.", description: "Your account was created successfully." });
      } else {
        // Upload avatar after login if file was selected
        if (avatarFile && signupRole === "influencer" && res.data?.user?.id) {
          const ext = avatarFile.name.split(".").pop();
          const filePath = `${res.data.user.id}/avatar.${ext}`;
          const { error: uploadErr } = await supabase.storage.from("avatars").upload(filePath, avatarFile, { upsert: true });
          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
            await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", res.data.user.id);
          }
        }
        toast({ title: "Welcome!", description: "Your account has been created." });
      }
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-auto py-8">
      <div className="fixed inset-0 gradient-purple opacity-20 pointer-events-none" />
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="glass rounded-2xl p-8 glow-purple animate-fade-in">
          <div className="flex flex-col items-center mb-6">
            <img src={famepassLogo} alt="Fame Pass" className="w-24 h-24 rounded-2xl mb-4 border-2 border-gold/30" />
            <h1 className="text-2xl font-display font-bold text-foreground">
              Fame<span className="text-gold">Pass</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Management Portal</p>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-muted-foreground text-sm">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required className="bg-secondary border-border focus:border-gold/50 focus:ring-gold/20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-muted-foreground text-sm">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="bg-secondary border-border focus:border-gold/50 focus:ring-gold/20" />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full gradient-gold text-accent-foreground font-semibold hover:opacity-90 transition-opacity">
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
              </div>

              <div className="space-y-2">
                <Button type="button" variant="outline" className="w-full border-border hover:bg-secondary" onClick={async () => {
                  const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                  if (error) toast({ title: "Google sign-in failed", description: String(error), variant: "destructive" });
                }}>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </Button>

                <Button type="button" variant="outline" className="w-full border-border hover:bg-secondary" onClick={async () => {
                  const { error } = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
                  if (error) toast({ title: "Apple sign-in failed", description: String(error), variant: "destructive" });
                }}>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Sign in with Apple
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">I am a...</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={signupRole === "influencer" ? "default" : "outline"} className={signupRole === "influencer" ? "gradient-gold text-accent-foreground" : "border-border"} onClick={() => setSignupRole("influencer")}>
                      Influencer
                    </Button>
                    <Button type="button" variant={signupRole === "venue" ? "default" : "outline"} className={signupRole === "venue" ? "gradient-gold text-accent-foreground" : "border-border"} onClick={() => setSignupRole("venue")}>
                      Venue
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Email</Label>
                  <Input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder="your@email.com" required className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Password</Label>
                  <Input type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} placeholder="Min 6 characters" required className="bg-secondary border-border" />
                </div>

                {signupRole === "influencer" && (
                  <>
                    {/* Avatar upload */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Profile Photo</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border bg-secondary flex items-center justify-center shrink-0">
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl text-muted-foreground">?</span>
                          )}
                        </div>
                        <label className="flex-1 flex flex-col items-center justify-center h-16 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-gold/40 transition-colors bg-secondary/50">
                          <span className="text-xs text-muted-foreground">{avatarFile ? avatarFile.name : "Click to upload"}</span>
                          <input type="file" accept="image/*" onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setAvatarFile(file);
                              setAvatarPreview(URL.createObjectURL(file));
                            }
                          }} className="hidden" />
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Full Name</Label>
                      <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" required className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Phone Number</Label>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+971..." className="bg-secondary border-border" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">Instagram Handle</Label>
                        <Input value={instagramHandle} onChange={e => setInstagramHandle(e.target.value)} placeholder="@handle" className="bg-secondary border-border" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">TikTok Handle</Label>
                        <Input value={tiktokHandle} onChange={e => setTiktokHandle(e.target.value)} placeholder="@handle" className="bg-secondary border-border" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">TikTok Followers</Label>
                        <Input type="number" value={tiktokFollowers} onChange={e => setTiktokFollowers(e.target.value)} placeholder="0" className="bg-secondary border-border" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">YouTube Link</Label>
                        <Input value={youtubeLink} onChange={e => setYoutubeLink(e.target.value)} placeholder="https://..." className="bg-secondary border-border" />
                      </div>
                    </div>
                  </>
                )}

                {signupRole === "venue" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Venue Name</Label>
                      <Input value={venueName} onChange={e => setVenueName(e.target.value)} placeholder="e.g. Sky Lounge" required className="bg-secondary border-border" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">Category</Label>
                        <Select value={venueCategory} onValueChange={setVenueCategory}>
                          <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {categories.map(c => (
                              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))}
                            {categories.length === 0 && <SelectItem value="dining">Dining</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">City</Label>
                        <Select value={venueCity} onValueChange={setVenueCity}>
                          <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {locations.map(l => (
                              <SelectItem key={l.id} value={l.city}>{l.city}</SelectItem>
                            ))}
                            {locations.length === 0 && <SelectItem value="other">Other</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                <Button type="submit" disabled={isLoading} className="w-full gradient-gold text-accent-foreground font-semibold hover:opacity-90 transition-opacity">
                  {isLoading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Login;
