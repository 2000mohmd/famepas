import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { supabase } from "@/integrations/supabase/client";

interface GoogleMapsContextType {
  isLoaded: boolean;
  apiKey: string | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({ isLoaded: false, apiKey: null });

export const useGoogleMaps = () => useContext(GoogleMapsContext);

export const GoogleMapsProvider = ({ children }: { children: ReactNode }) => {
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    supabase.functions.invoke("google-maps-key").then(({ data }) => {
      if (data?.key) setApiKey(data.key);
    });
  }, []);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    id: "google-map-script",
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded: !!apiKey && isLoaded, apiKey }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};
