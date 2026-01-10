import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { X, Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface Location {
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  isLive?: boolean;
  isCurrentUser?: boolean;
}

interface LocationMapPreviewProps {
  locations: Location[];
  onClose: () => void;
  onNavigate?: (lat: number, lng: number) => void;
}

// Custom marker icons
const createMarkerIcon = (isCurrentUser: boolean, isLive: boolean) => {
  const color = isCurrentUser ? "#f97316" : "#14b8a6";
  const pulse = isLive ? "animate-pulse" : "";
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div class="relative ${pulse}">
        <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg" style="background: ${color}">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        ${isLive ? `<span class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>` : ""}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
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
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
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
  const center =
    locations.length > 0
      ? { lat: locations[0].latitude, lng: locations[0].longitude }
      : { lat: 0, lng: 0 };

  const handleNavigate = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, "_blank");
    onNavigate?.(lat, lng);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-card overflow-hidden w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Location</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="h-[300px] relative">
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={14}
            className="h-full w-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater locations={locations} />
            {locations.map((loc, index) => (
              <Marker
                key={`${loc.userId}-${index}`}
                position={[loc.latitude, loc.longitude]}
                icon={createMarkerIcon(!!loc.isCurrentUser, !!loc.isLive)}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-medium">{loc.userName}</p>
                    {loc.isLive && (
                      <span className="text-xs text-green-600">
                        Live Location
                      </span>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="p-4 space-y-2">
          {locations
            .filter((loc) => !loc.isCurrentUser)
            .map((loc) => (
              <Button
                key={loc.userId}
                onClick={() => handleNavigate(loc.latitude, loc.longitude)}
                className="w-full gradient-accent"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Navigate to {loc.userName}
              </Button>
            ))}
        </div>
      </div>
    </div>
  );
}
