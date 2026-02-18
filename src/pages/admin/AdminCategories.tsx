import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", icon: "" });
  const { toast } = useToast();

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories((data as Category[]) ?? []);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async () => {
    if (!newCat.name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("categories").insert({ name: newCat.name, icon: newCat.icon || null } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Category created" });
      setOpen(false);
      setNewCat({ name: "", icon: "" });
      fetchCategories();
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("categories").update({ is_active: !active } as any).eq("id", id);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    fetchCategories();
  };

  return (
    <DashboardLayout type="admin">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Manage <span className="text-gold">Categories</span></h1>
            <p className="text-muted-foreground mt-1">{categories.length} categories</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-accent-foreground font-semibold">
                <Plus className="w-4 h-4 mr-2" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground font-display">New Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Name</Label>
                  <Input value={newCat.name} onChange={e => setNewCat(v => ({ ...v, name: e.target.value }))} placeholder="e.g. Hotels" className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Icon (optional)</Label>
                  <Input value={newCat.icon} onChange={e => setNewCat(v => ({ ...v, icon: e.target.value }))} placeholder="e.g. 🏨" className="bg-secondary border-border" />
                </div>
                <Button onClick={handleCreate} className="w-full gradient-gold text-accent-foreground font-semibold">Create Category</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Icon</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No categories yet</td></tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 text-xl">{cat.icon || "—"}</td>
                    <td className="p-4 font-medium text-foreground capitalize">{cat.name}</td>
                    <td className="p-4">
                      <Badge className={cat.is_active ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                        {cat.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4 flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(cat.id, cat.is_active)} className="text-muted-foreground hover:text-gold">
                        {cat.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminCategories;
