import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ImagePlus, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCat, setNewCat] = useState({ name: "", image_url: "" });
  const { toast } = useToast();

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories((data as Category[]) ?? []);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("category-images").upload(filePath, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data: { publicUrl } } = supabase.storage.from("category-images").getPublicUrl(filePath);
      setNewCat(v => ({ ...v, image_url: publicUrl }));
    }
    setUploading(false);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setNewCat({ name: cat.name, image_url: cat.image_url || "" });
    setOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setNewCat({ name: "", image_url: "" });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!newCat.name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!newCat.image_url) {
      toast({ title: "Cover image is required", description: "Please upload a cover image for the category", variant: "destructive" });
      return;
    }
    const payload = { name: newCat.name, image_url: newCat.image_url };
    const { error } = editingId
      ? await supabase.from("categories").update(payload as any).eq("id", editingId)
      : await supabase.from("categories").insert(payload as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Category updated" : "Category created" });
      setOpen(false);
      setEditingId(null);
      setNewCat({ name: "", image_url: "" });
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
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditingId(null); }}>
            <Button onClick={openCreate} className="gradient-gold text-accent-foreground font-semibold">
              <Plus className="w-4 h-4 mr-2" /> Add Category
            </Button>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground font-display">{editingId ? "Edit Category" : "New Category"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Name *</Label>
                  <Input value={newCat.name} onChange={e => setNewCat(v => ({ ...v, name: e.target.value }))} placeholder="e.g. Hotels" className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Icon (emoji, optional)</Label>
                  <Input value={newCat.icon} onChange={e => setNewCat(v => ({ ...v, icon: e.target.value }))} placeholder="e.g. 🏨" className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Cover Image *</Label>
                  {newCat.image_url ? (
                    <div className="relative">
                      <img src={newCat.image_url} alt="Category cover" className="w-full h-40 object-cover rounded-lg border border-border" />
                      <Button size="sm" variant="ghost" onClick={() => setNewCat(v => ({ ...v, image_url: "" }))} className="absolute top-2 right-2 text-destructive bg-background/80 hover:bg-background">
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-gold/40 transition-colors bg-secondary/50">
                      <ImagePlus className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Click to upload cover image"}</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                    </label>
                  )}
                </div>
                <Button onClick={handleSave} disabled={uploading} className="w-full gradient-gold text-accent-foreground font-semibold">{editingId ? "Save Changes" : "Create Category"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Cover</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Icon</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No categories yet</td></tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="w-16 h-12 object-cover rounded-md border border-border" />
                      ) : (
                        <div className="w-16 h-12 rounded-md bg-secondary flex items-center justify-center text-xs text-muted-foreground">none</div>
                      )}
                    </td>
                    <td className="p-4 text-xl">{cat.icon || "—"}</td>
                    <td className="p-4 font-medium text-foreground capitalize">{cat.name}</td>
                    <td className="p-4">
                      <Badge className={cat.is_active ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                        {cat.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4 flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(cat)} className="text-muted-foreground hover:text-gold">
                        <Pencil className="w-4 h-4" />
                      </Button>
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
