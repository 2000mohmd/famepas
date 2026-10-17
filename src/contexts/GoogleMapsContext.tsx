import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import type { Libraries } from "@react-google-maps/api";
import { supabase } from "@/integrations/supabase/client";

const GOOGLE_MAPS_LIBRARIES: Libraries = ["places"];

interface GoogleMapsContextType {
  isLoaded: boolean;
  apiKey: string | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({ isLoaded: false, apiKey: null });

export const useGoogleMaps = () => useContext(GoogleMapsContext);

// Renders nothing; only loads the script once the key is known. It sits beside
// the app, not around it: wrapping the app in a loader only after the key arrived
// changed the tree shape, which remounted every page and loaded its data twice.
const MapsScript = ({ apiKey, onLoaded }: { apiKey: string; onLoaded: () => void }) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: "google-map-script",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  useEffect(() => { if (isLoaded) onLoaded(); }, [isLoaded, onLoaded]);
  return null;
};

export const GoogleMapsProvider = ({ children }: { children: ReactNode }) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    supabase.functions.invoke("google-maps-key").then(({ data }) => {
      if (data?.key) setApiKey(data.key);
    });
  }, []);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, apiKey }}>
      {apiKey && <MapsScript apiKey={apiKey} onLoaded={() => setIsLoaded(true)} />}
      {children}
    </GoogleMapsContext.Provider>
  );
};
