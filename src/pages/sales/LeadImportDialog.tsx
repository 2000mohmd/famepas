import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Upload, AlertTriangle } from "lucide-react";
import { SOURCES, todayISO } from "./leadMeta";

const db = supabase as any;

/** Accepts the loose header spellings a Google Maps or Apify export produces. */
const FIELD_ALIASES: Record<string, string[]> = {
  venue_name: ["venue", "venue name", "name", "title", "business", "business name"],
  contact_name: ["contact", "contact name", "owner", "manager"],
  contact_role: ["role", "contact role", "position"],
  phone: ["phone", "phone number", "telephone", "mobile", "whatsapp"],
  instagram_handle: ["instagram", "instagram handle", "ig", "handle"],
  instagram_followers: ["instagram followers", "followers", "ig followers"],
  category: ["category", "type", "cuisine"],
  area: ["area", "neighbourhood", "neighborhood", "district"],
  city: ["city", "town"],
  address: ["address", "full address", "street"],
  maps_place_id: ["place id", "place_id", "google maps id", "maps id", "cid"],
  google_rating: ["rating", "google rating", "stars", "score"],
  google_review_count: ["reviews", "review count", "google reviews", "number of reviews"],
  price_level: ["price", "price level", "price range"],
};

const normaliseHeader = (h: string) => h.toLowerCase().trim().replace(/[_-]+/g, " ");

const mapRow = (raw: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const [key, value] of Object.entries(raw)) {
      if (aliases.includes(normaliseHeader(key)) && value !== "" && value !== null && value !== undefined) {
        out[field] = value;
        break;
      }
    }
  }
  return out;
};

const toNum = (v: unknown) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** "$$" and "3" both mean price level 3. */
const toPriceLevel = (v: unknown) => {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).trim();
  if (/^\$+$/.test(s)) return Math.min(4, s.length);
  const n = toNum(s);
  return n && n >= 1 && n <= 4 ? Math.round(n) : null;
};

interface Row {
  data: Record<string, unknown>;
  status: "ok" | "duplicate" | "invalid";
  note?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
  owners: { user_id: string; full_name: string }[];
  fallbackOwner: string;
}

const LeadImportDialog = ({ open, onOpenChange, onImported, owners, fallbackOwner }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [defaultOwner, setDefaultOwner] = useState(fallbackOwner);
  const [source, setSource] = useState("google_maps");
  const [territories, setTerritories] = useState<Record<string, string>>({});
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());

  const reset = () => setRows([]);

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = book.Sheets[book.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      // Imported spellings ("cafes", "Restaurant") are snapped to the one
      // canonical category list so the lead form can display them.
      const { data: cats } = await supabase.from("categories").select("name");
      const canonical = new Map((cats ?? []).map((c: any) => [String(c.name).toLowerCase(), c.name]));
      setCategoryMap(canonical);

      const { data: terr } = await db.from("sales_territories").select("area, rep_id");
      const territoryMap: Record<string, string> = Object.fromEntries(
        (terr ?? []).map((t: any) => [String(t.area).toLowerCase(), t.rep_id]),
      );
      setTerritories(territoryMap);

      const parsed: Row[] = [];
      for (const rawRow of raw) {
        const data = mapRow(rawRow);
        if (!data.venue_name || !data.phone) {
          parsed.push({ data, status: "invalid", note: "Missing venue name or phone" });
          continue;
        }
        const { data: dupes } = await db.rpc("check_lead_duplicate", {
          _phone: String(data.phone),
          _instagram: data.instagram_handle ? String(data.instagram_handle) : null,
          _exclude: null,
          _maps_place_id: data.maps_place_id ? String(data.maps_place_id) : null,
        });
        parsed.push(
          dupes?.length
            ? { data, status: "duplicate", note: `Already here as ${dupes[0].match_name}` }
            : { data, status: "ok" },
        );
      }
      setRows(parsed);
    } catch (e: any) {
      toast({ title: "Couldn't read that file", description: e.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const importable = rows.filter((r) => r.status === "ok");

  const runImport = async () => {
    if (!importable.length) return;
    setImporting(true);
    const payload = importable.map(({ data }) => {
      const area = data.area ? String(data.area) : null;
      return {
        venue_name: String(data.venue_name),
        contact_name: data.contact_name ? String(data.contact_name) : "Unknown",
        contact_role: data.contact_role ? String(data.contact_role) : null,
        phone: String(data.phone),
        instagram_handle: data.instagram_handle ? String(data.instagram_handle) : null,
        instagram_followers: toNum(data.instagram_followers),
        category: data.category
          ? categoryMap.get(String(data.category).trim().toLowerCase()) ?? String(data.category).trim()
          : null,
        area,
        city: data.city ? String(data.city) : null,
        address: data.address ? String(data.address) : null,
        maps_place_id: data.maps_place_id ? String(data.maps_place_id) : null,
        google_rating: toNum(data.google_rating),
        google_review_count: toNum(data.google_review_count),
        price_level: toPriceLevel(data.price_level),
        source,
        stage: "new",
        // Territory decides the owner where one is set for the area; the
        // picker below covers everything else, so no lead lands unassigned.
        owner_id: (area && territories[area.toLowerCase()]) || defaultOwner,
        next_action: "First contact",
        next_action_date: todayISO(),
      };
    });

    const { error } = await db.from("leads").insert(payload);
    setImporting(false);
    if (error) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Imported ${payload.length} lead${payload.length === 1 ? "" : "s"}` });
    reset();
    onImported();
    onOpenChange(false);
  };

  const counts = {
    ok: rows.filter((r) => r.status === "ok").length,
    duplicate: rows.filter((r) => r.status === "duplicate").length,
    invalid: rows.filter((r) => r.status === "invalid").length,
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Import leads</DialogTitle></DialogHeader>

        <p className="text-sm text-muted-foreground">
          Upload a CSV or Excel export — a Google Maps scrape works directly. Column names are matched loosely,
          so "Business name", "Rating" and "Place ID" are all understood. Every row is duplicate-checked before import.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Source to record</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SOURCES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Owner when no territory matches</Label>
            <Select value={defaultOwner} onValueChange={setDefaultOwner}>
              <SelectTrigger><SelectValue placeholder="Pick a rep" /></SelectTrigger>
              <SelectContent>{owners.map((o) => <SelectItem key={o.user_id} value={o.user_id}>{o.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>File</Label>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-secondary file:text-foreground"
          />
        </div>

        {parsing && <p className="text-sm text-muted-foreground">Reading and duplicate-checking…</p>}

        {rows.length > 0 && (
          <>
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-success/20 text-success border-success/30">{counts.ok} ready</Badge>
              {counts.duplicate > 0 && <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-400/40">{counts.duplicate} already here</Badge>}
              {counts.invalid > 0 && <Badge variant="secondary">{counts.invalid} unusable</Badge>}
            </div>

            {(counts.duplicate > 0 || counts.invalid > 0) && (
              <div className="rounded-lg border border-border p-3 max-h-40 overflow-y-auto space-y-1">
                {rows.filter((r) => r.status !== "ok").map((r, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    <AlertTriangle className="w-3 h-3 inline mr-1 -mt-0.5" />
                    {String(r.data.venue_name ?? "(no name)")} — {r.note}
                  </p>
                ))}
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => void runImport()}
            disabled={importing || !importable.length || !defaultOwner}
            className="btn-sales-primary font-semibold"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            {importing ? "Importing…" : `Import ${importable.length || ""}`.trim()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadImportDialog;
