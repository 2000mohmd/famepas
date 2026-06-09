import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const VenueLocations = () => {
  const { user } = useAuth();
  const [venue, setVenue] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("venues").select("*").eq("owner_id", user.id).maybeSingle().then(({ data }) => setVenue(data));
  }, [user]);

  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[28px] font-bold text-foreground">Locations</h1>
          <Button style={{ background: "#e8547a" }} className="text-white hover:opacity-90">
            <Plus className="w-4 h-4 mr-1.5" /> Add Location
          </Button>
        </div>

        {venue ? (
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#fce7eb" }}>
                <MapPin className="w-5 h-5" style={{ color: "#e8547a" }} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{venue.name}</h3>
                <p className="text-sm text-muted-foreground">{venue.address || venue.city || "No address yet"}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-border rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">No locations yet</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VenueLocations;
