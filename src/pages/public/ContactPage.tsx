import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const ContactPage = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      toast({ title: "Message sent!", description: "We'll get back to you soon." });
      setForm({ name: "", email: "", message: "" });
      setSending(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-accent text-sm font-semibold tracking-widest uppercase mb-3">Get in Touch</p>
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground">
              Contact <span className="text-gold">Us</span>
            </h1>
            <p className="text-muted-foreground mt-4 max-w-lg mx-auto">Have questions? We'd love to hear from you.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Contact Info */}
            <div className="space-y-8">
              <div className="rounded-2xl bg-card border border-border p-8 space-y-6">
                <h2 className="text-xl font-display font-bold text-foreground">Contact Information</h2>
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0"><Mail className="w-5 h-5" /></div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Email</p>
                      <p className="text-sm text-muted-foreground">hello@famepass.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0"><Phone className="w-5 h-5" /></div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Phone</p>
                      <p className="text-sm text-muted-foreground">+971 50 123 4567</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0"><MapPin className="w-5 h-5" /></div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Address</p>
                      <p className="text-sm text-muted-foreground">Dubai, United Arab Emirates</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <form onSubmit={handleSubmit} className="rounded-2xl bg-card border border-border p-8 space-y-5">
              <h2 className="text-xl font-display font-bold text-foreground">Send a Message</h2>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" required className="bg-background border-border rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" required className="bg-background border-border rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How can we help?" rows={5} required className="bg-background border-border rounded-xl" />
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl h-11" disabled={sending}>
                {sending ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ContactPage;
