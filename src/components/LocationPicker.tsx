import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Navigation, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with webpack/vite
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LocationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLat?: number | null;
  initialLng?: number | null;
  onLocationSelect: (lat: number, lng: number, address: string, city: string) => void;
}

interface MapClickHandlerProps {
  onLocationChange: (lat: number, lng: number) => void;
}

function MapClickHandler({ onLocationChange }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface RecenterMapProps {
  lat: number;
  lng: number;
}

function RecenterMap({ lat, lng }: RecenterMapProps) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function LocationPicker({
  open,
  onOpenChange,
  initialLat,
  initialLng,
  onLocationSelect,
}: LocationPickerProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number }>({
    lat: initialLat || 20.5937,
    lng: initialLng || 78.9629,
  });
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const markerRef = useRef<L.Marker>(null);

  // Update position when initial values change
  useEffect(() => {
    if (initialLat && initialLng) {
      setPosition({ lat: initialLat, lng: initialLng });
    }
  }, [initialLat, initialLng]);

  // Reverse geocode when position changes
  useEffect(() => {
    const reverseGeocode = async () => {
      setIsLoadingAddress(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}&addressdetails=1&zoom=18`
        );
        const data = await response.json();
        if (data.address) {
          const addressParts = [];
          if (data.address.house_number) addressParts.push(data.address.house_number);
          if (data.address.road) addressParts.push(data.address.road);
          if (data.address.neighbourhood) addressParts.push(data.address.neighbourhood);
          if (data.address.suburb) addressParts.push(data.address.suburb);

          const formattedAddress = addressParts.length > 0
            ? addressParts.join(", ")
            : data.display_name?.split(",").slice(0, 3).join(", ") || "";

          setAddress(formattedAddress);
          setCity(
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.municipality ||
            data.address.county ||
            ""
          );
        }
      } catch (error) {
        console.log("Reverse geocode error:", error);
      }
      setIsLoadingAddress(false);
    };

    reverseGeocode();
  }, [position]);

  const handleLocationChange = (lat: number, lng: number) => {
    setPosition({ lat, lng });
  };

  const handleMarkerDrag = () => {
    const marker = markerRef.current;
    if (marker) {
      const latlng = marker.getLatLng();
      setPosition({ lat: latlng.lat, lng: latlng.lng });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        setPosition({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
        toast.success("Location found!");
      } else {
        toast.error("Location not found. Try a different search term.");
      }
    } catch (error) {
      toast.error("Search failed. Please try again.");
    }
    setIsSearching(false);
  };

  const detectCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          toast.success("Current location detected!");
        },
        (error) => {
          toast.error("Could not detect location. Please search or click on the map.");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  };

  const handleConfirm = () => {
    onLocationSelect(position.lat, position.lng, address, city);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Pick Your Location
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 space-y-3">
          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search for a location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSearch}
              disabled={isSearching}
            >
              <Search className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={detectCurrentLocation}
              title="Use current location"
            >
              <Navigation className="w-4 h-4" />
            </Button>
          </div>

          {/* Map */}
          <div className="h-[300px] rounded-lg overflow-hidden border">
            <MapContainer
              center={[position.lat, position.lng]}
              zoom={15}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker
                position={[position.lat, position.lng]}
                draggable={true}
                ref={markerRef}
                eventHandlers={{ dragend: handleMarkerDrag }}
              />
              <MapClickHandler onLocationChange={handleLocationChange} />
              <RecenterMap lat={position.lat} lng={position.lng} />
            </MapContainer>
          </div>

          {/* Address preview */}
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="text-muted-foreground text-xs mb-1">Selected Address:</p>
            {isLoadingAddress ? (
              <p className="text-muted-foreground">Loading address...</p>
            ) : (
              <>
                <p className="font-medium">{address || "Click on map or drag marker"}</p>
                {city && <p className="text-muted-foreground">{city}</p>}
              </>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="gradient-primary text-white">
            Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
