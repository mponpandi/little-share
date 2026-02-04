import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { X, Navigation, Layers, MapPin, ExternalLink } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface Location {
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  isLive?: boolean;
  isCurrentUser?: boolean;
}

interface LocationMapPreviewProps {
  locations: Location[];
  onClose: () => void;
  onNavigate?: (lat: number, lng: number) => void;
}

// Google Maps tile URLs
const GOOGLE_TILES = {
  street: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
  satellite: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
  hybrid: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
};

type MapType = "street" | "satellite" | "hybrid";

// Custom marker icons - Google Maps style
const createMarkerIcon = (isCurrentUser: boolean, isLive: boolean) => {
  const color = isCurrentUser ? "#4285F4" : "#EA4335"; // Google blue for current user, Google red for others
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div class="relative ${isLive ? "animate-pulse" : ""}">
        <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0C8.954 0 0 8.954 0 20c0 14 20 28 20 28s20-14 20-28C40 8.954 31.046 0 20 0z" fill="${color}"/>
          <circle cx="20" cy="18" r="8" fill="white"/>
          <circle cx="20" cy="18" r="4" fill="${color}"/>
        </svg>
        ${isLive ? `
          <span class="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
          </span>
        ` : ""}
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -48],
  });
};

function MapUpdater({ locations }: { locations: Location[] }) {
  const map = useMap();
  const prevLocationsRef = useRef<Location[]>([]);

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map((loc) => [loc.latitude, loc.longitude])
      );
      map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 16, duration: 0.8 });
    }
    prevLocationsRef.current = locations;
  }, [locations, map]);

  return null;
}

export function LocationMapPreview({
  locations,
  onClose,
  onNavigate,
}: LocationMapPreviewProps) {
  const [mapType, setMapType] = useState<MapType>("street");
  
  const center =
    locations.length > 0
      ? { lat: locations[0].latitude, lng: locations[0].longitude }
      : { lat: 0, lng: 0 };

  const cycleMapType = () => {
    const types: MapType[] = ["street", "satellite", "hybrid"];
    const currentIndex = types.indexOf(mapType);
    setMapType(types[(currentIndex + 1) % types.length]);
  };

  const handleNavigate = (lat: number, lng: number, userName: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, "_blank");
    onNavigate?.(lat, lng);
  };

  const openInMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl overflow-hidden w-full max-w-lg border border-border/50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Location</h3>
              <p className="text-xs text-muted-foreground">
                {locations.filter(l => l.isLive).length > 0 ? "Live sharing active" : "Shared location"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-destructive/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Map */}
        <div className="h-[320px] relative">
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={15}
            className="h-full w-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; Google Maps'
              url={GOOGLE_TILES[mapType]}
            />
            {/* Add labels overlay for satellite/hybrid */}
            {(mapType === 'satellite' || mapType === 'hybrid') && (
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}"
              />
            )}
            <MapUpdater locations={locations} />
            
            {/* Accuracy circles for live locations */}
            {locations.filter(loc => loc.isLive && loc.accuracy).map((loc) => (
              <Circle
                key={`accuracy-${loc.userId}`}
                center={[loc.latitude, loc.longitude]}
                radius={loc.accuracy || 50}
                pathOptions={{
                  color: loc.isCurrentUser ? "#4285F4" : "#EA4335",
                  fillColor: loc.isCurrentUser ? "#4285F4" : "#EA4335",
                  fillOpacity: 0.15,
                  weight: 1,
                }}
              />
            ))}
            
            {locations.map((loc, index) => (
              <Marker
                key={`${loc.userId}-${index}`}
                position={[loc.latitude, loc.longitude]}
                icon={createMarkerIcon(!!loc.isCurrentUser, !!loc.isLive)}
              >
                <Popup className="custom-popup">
                  <div className="text-center p-1 min-w-[120px]">
                    <p className="font-semibold text-foreground">{loc.userName}</p>
                    {loc.isLive && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Live
                      </span>
                    )}
                    {!loc.isCurrentUser && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full text-xs"
                        onClick={() => openInMaps(loc.latitude, loc.longitude)}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View in Maps
                      </Button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Map type toggle */}
          <Button
            onClick={cycleMapType}
            size="sm"
            variant="secondary"
            className="absolute top-3 right-3 z-[1000] shadow-lg bg-white/95 hover:bg-white text-foreground border"
          >
            <Layers className="w-4 h-4 mr-1" />
            <span className="capitalize text-xs">{mapType}</span>
          </Button>
        </div>

        {/* Navigation buttons */}
        <div className="p-4 space-y-2 bg-muted/30">
          {locations
            .filter((loc) => !loc.isCurrentUser)
            .map((loc) => (
              <Button
                key={loc.userId}
                onClick={() => handleNavigate(loc.latitude, loc.longitude, loc.userName)}
                className="w-full bg-[#4285F4] hover:bg-[#3367D6] text-white shadow-md"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Navigate to {loc.userName}
                {loc.isLive && (
                  <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                    Live
                  </span>
                )}
              </Button>
            ))}
          
          {locations.filter((loc) => !loc.isCurrentUser).length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-2">
              This is your current location
            </p>
          )}
        </div>
      </div>
    </div>
  );
}