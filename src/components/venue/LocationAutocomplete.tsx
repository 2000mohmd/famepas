import { useEffect, useRef } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from "@/contexts/GoogleMapsContext";
import { useServiceCountryCodes } from "@/lib/serviceCountries";

export interface PickedPlace {
  address: string;
  city?: string;
  country?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
}

interface Props {
  defaultValue?: string;
  placeholder?: string;
  onPick: (p: PickedPlace) => void;
  /** Fires on every keystroke so callers can accept a manually typed address. */
  onTextChange?: (text: string) => void;
}


const LocationAutocomplete = ({ defaultValue, placeholder, onPick }: Props) => {
  const { isLoaded } = useGoogleMaps();
  const ref = useRef<google.maps.places.Autocomplete | null>(null);
  const countryCodes = useServiceCountryCodes();

  // Keep the restriction in sync when the admin-configured countries load/change.
  useEffect(() => {
    ref.current?.setOptions({
      componentRestrictions: { country: countryCodes.map(c => c.toLowerCase()) },
    });
  }, [countryCodes]);

  if (!isLoaded) {
    return <Input placeholder="Loading map…" disabled />;
  }

  const onPlace = () => {
    const place = ref.current?.getPlace();
    if (!place) return;
    const comps = place.address_components || [];
    const get = (t: string) => comps.find(c => c.types.includes(t))?.long_name;
    onPick({
      address: place.formatted_address || "",
      city: get("locality") || get("postal_town") || get("administrative_area_level_2"),
      country: get("country"),
      zip: get("postal_code"),
      latitude: place.geometry?.location?.lat(),
      longitude: place.geometry?.location?.lng(),
    });
  };

  return (
    <Autocomplete
      onLoad={a => {
        ref.current = a;
        a.setOptions({ componentRestrictions: { country: countryCodes.map(c => c.toLowerCase()) } });
      }}
      onPlaceChanged={onPlace}
    >
      <Input defaultValue={defaultValue} placeholder={placeholder || "Search address…"} />
    </Autocomplete>
  );
};

export default LocationAutocomplete;
