import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown, Info } from "lucide-react";

const VenueReports = () => {
  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[28px] font-bold text-foreground">Reports</h1>
          <div className="flex items-center gap-2 text-sm">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-foreground">
              <Calendar className="w-4 h-4" /> All time <Info className="w-3 h-3 text-muted-foreground" />
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-foreground">
              No Campaigns <ChevronDown className="w-3 h-3" />
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-foreground">
              All Locations <ChevronDown className="w-3 h-3" />
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-foreground">
              All Content <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl py-24 text-center">
          <p className="text-muted-foreground">No data for this date range</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VenueReports;
