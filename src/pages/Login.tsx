import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import famepassLogo from "@/assets/famepass-logo.jpeg";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="absolute inset-0 gradient-purple opacity-20" />
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="glass rounded-2xl p-8 glow-purple animate-fade-in">
          <div className="flex flex-col items-center mb-8">
            <img
              src={famepassLogo}
              alt="Fame Pass"
              className="w-24 h-24 rounded-2xl mb-4 border-2 border-gold/30"
            />
            <h1 className="text-2xl font-display font-bold text-foreground">
              Fame<span className="text-gold">Pass</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Management Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="bg-secondary border-border focus:border-gold/50 focus:ring-gold/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground text-sm">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-secondary border-border focus:border-gold/50 focus:ring-gold/20"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full gradient-gold text-accent-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
