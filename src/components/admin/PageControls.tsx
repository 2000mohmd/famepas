import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

export default function PageControls({ page, pageCount, onChange }: Props) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 p-3 border-t border-border">
      <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} className="h-7 px-2">
        <ChevronLeft className="w-4 h-4" /> Prev
      </Button>
      <span className="text-xs text-muted-foreground">Page {page} of {pageCount}</span>
      <Button variant="ghost" size="sm" disabled={page >= pageCount} onClick={() => onChange(page + 1)} className="h-7 px-2">
        Next <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
