import DashboardLayout from "@/components/DashboardLayout";
import { EmptyState, ClipboardIllustration } from "@/components/venue/EmptyState";
import { Film } from "lucide-react";

const VenueContent = () => {
  return (
    <DashboardLayout type="venue">
      <div className="animate-fade-in">
        <h1 className="text-[28px] font-bold text-foreground mb-8">Content</h1>
        <EmptyState
          icon={<Film className="w-12 h-12" />}
          title="No content yet"
          description="When influencers post content from your campaigns, it will appear here."
        />
      </div>
    </DashboardLayout>
  );
};

export default VenueContent;
