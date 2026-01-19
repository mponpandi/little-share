import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Navigation, Search, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom red marker icon for selected location
const selectedLocationIcon = L.divIcon({
  className: 'custom-marker-icon',
  html: `
    <div class="relative">
      <div class="w-10 h-10 bg-red-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center transform -translate-x-1/2 -translate-y-full">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
      <div class="absolute left-1/2 -translate-x-1/2 -bottom-1 w-3 h-3 bg-red-500 rotate-45 border-r-2 border-b-2 border-white"></div>
    </div>
  `,
  iconSize: [40, 48],
  iconAnchor: [20, 48],
});

// Google Maps tile URLs
const GOOGLE_TILES = {
  street: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
  satellite: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
  hybrid: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
};

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
  shouldAnimate?: boolean;
}

function RecenterMap({ lat, lng, shouldAnimate = false }: RecenterMapProps) {
  const map = useMap();
  const prevPositionRef = useRef({ lat, lng });
  
  useEffect(() => {
    const hasChanged = prevPositionRef.current.lat !== lat || prevPositionRef.current.lng !== lng;
    if (hasChanged) {
      if (shouldAnimate) {
        map.flyTo([lat, lng], Math.max(map.getZoom(), 17), { duration: 1.2 });
      } else {
        map.setView([lat, lng], Math.max(map.getZoom(), 17));
      }
      prevPositionRef.current = { lat, lng };
    }
  }, [lat, lng, map, shouldAnimate]);
  return null;
}

type MapType = 'street' | 'satellite' | 'hybrid';

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
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [mapType, setMapType] = useState<MapType>('street');
  const markerRef = useRef<L.Marker>(null);
  const watchIdRef = useRef<number | null>(null);

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
    setShouldAnimate(true);
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
      setIsDetectingLocation(true);
      setAccuracy(null);
      
      // Clear any existing watch
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      
      // Use watchPosition for more accurate real-time location
      let positionCount = 0;
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          positionCount++;
          setShouldAnimate(true);
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setAccuracy(pos.coords.accuracy);
          
          // After getting 2 accurate positions, stop watching
          if (positionCount >= 2 || pos.coords.accuracy < 50) {
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
            setIsDetectingLocation(false);
            toast.success(`Location detected! (±${Math.round(pos.coords.accuracy)}m)`);
          }
        },
        (error) => {
          setIsDetectingLocation(false);
          toast.error("Could not detect location. Please search or click on the map.");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
      
      // Fallback timeout to stop watching after 10 seconds
      setTimeout(() => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
          setIsDetectingLocation(false);
        }
      }, 10000);
    }
  };

  const cycleMapType = () => {
    const types: MapType[] = ['street', 'satellite', 'hybrid'];
    const currentIndex = types.indexOf(mapType);
    const nextIndex = (currentIndex + 1) % types.length;
    setMapType(types[nextIndex]);
  };
  
  // Cleanup watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

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
              disabled={isDetectingLocation}
              title="Use current location"
              className={isDetectingLocation ? "animate-pulse" : ""}
            >
              <Navigation className={`w-4 h-4 ${isDetectingLocation ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Map */}
          <div className="h-[300px] rounded-xl overflow-hidden border-2 border-border/50 shadow-lg relative">
            <MapContainer
              center={[position.lat, position.lng]}
              zoom={17}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
            >
              <TileLayer
                url={GOOGLE_TILES[mapType]}
                maxZoom={20}
              />
              {/* Labels overlay for satellite/hybrid */}
              {(mapType === 'satellite' || mapType === 'hybrid') && (
                <TileLayer
                  url="https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}"
                  maxZoom={20}
                />
              )}
              {/* Accuracy circle */}
              {accuracy && (
                <Circle
                  center={[position.lat, position.lng]}
                  radius={accuracy}
                  pathOptions={{
                    color: '#4285F4',
                    fillColor: '#4285F4',
                    fillOpacity: 0.15,
                    weight: 2,
                  }}
                />
              )}
              <Marker
                position={[position.lat, position.lng]}
                draggable={true}
                ref={markerRef}
                icon={selectedLocationIcon}
                eventHandlers={{ dragend: handleMarkerDrag }}
              />
              <MapClickHandler onLocationChange={handleLocationChange} />
              <RecenterMap lat={position.lat} lng={position.lng} shouldAnimate={shouldAnimate} />
            </MapContainer>
            
            {/* Map type toggle button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={cycleMapType}
              className="absolute top-3 right-3 z-[1000] bg-white/95 hover:bg-white shadow-md border"
            >
              <Layers className="w-4 h-4 mr-1.5" />
              <span className="text-xs font-medium capitalize">{mapType}</span>
            </Button>
            
            {/* Google Maps style hint */}
            <div className="absolute bottom-2 left-2 z-[1000] bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground">
              Tap map or drag marker
            </div>
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

        <DialogFooter className="p-4 pt-2 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isLoadingAddress || !address}
            className="gradient-primary text-white font-semibold px-6"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
