import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { supabase } from "@/integrations/supabase/client";

const GOOGLE_MAPS_LIBRARIES = ["places"] as const;

interface GoogleMapsContextType {
  isLoaded: boolean;
  apiKey: string | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({ isLoaded: false, apiKey: null });

export const useGoogleMaps = () => useContext(GoogleMapsContext);

const MapsLoader = ({ apiKey, children }: { apiKey: string; children: ReactNode }) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: "google-map-script",
    libraries: GOOGLE_MAPS_LIBRARIES as any,
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, apiKey }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export const GoogleMapsProvider = ({ children }: { children: ReactNode }) => {
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    supabase.functions.invoke("google-maps-key").then(({ data }) => {
      if (data?.key) setApiKey(data.key);
    });
  }, []);

  if (!apiKey) {
    return (
      <GoogleMapsContext.Provider value={{ isLoaded: false, apiKey: null }}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  return <MapsLoader apiKey={apiKey}>{children}</MapsLoader>;
};
