import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const UploadedWebsite = ({ page = "index" }: { page?: "index" | "creators" | "venues" }) => {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const sendCategories = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== "website-ready") return;
      const { data, error } = await supabase.from("categories").select("name, image_url").eq("is_active", true).order("name");
      if (!error && data) frame.current?.contentWindow?.postMessage({ type: "website-categories", categories: data }, window.location.origin);
    };
    window.addEventListener("message", sendCategories);
    return () => window.removeEventListener("message", sendCategories);
  }, [page]);
  return <iframe ref={frame} key={page} src={`/website/${page}.html${window.location.hash}`} title={page === "index" ? "FamePass" : `FamePass for ${page}`} className="block h-[100dvh] w-full border-0" />;
};

export default UploadedWebsite;