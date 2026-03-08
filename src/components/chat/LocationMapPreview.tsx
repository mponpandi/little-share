import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { X, Navigation, Layers, MapPin, Copy, Locate, Route } from "lucide-react";
import { toast } from "sonner";
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

const GOOGLE_TILES = {
  street: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
  satellite: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
  hybrid: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
};

type MapType = "street" | "satellite" | "hybrid";

const createMarkerIcon = (isCurrentUser: boolean, isLive: boolean) => {
  const color = isCurrentUser ? "#4285F4" : "#EA4335";
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

const currentLocationIcon = L.divIcon({
  className: "current-loc-marker",
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-10 h-10 bg-blue-500/20 rounded-full animate-ping"></div>
      <div class="absolute w-7 h-7 bg-blue-500/15 rounded-full animate-pulse"></div>
      <div class="relative w-4 h-4 bg-blue-600 rounded-full border-[3px] border-white shadow-lg z-10"></div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function MapUpdater({ locations, routeLine }: { locations: Location[]; routeLine: [number, number][] | null }) {
  const map = useMap();

  useEffect(() => {
    if (routeLine && routeLine.length >= 2) {
      const bounds = L.latLngBounds(routeLine);
      map.flyToBounds(bounds, { padding: [80, 80], maxZoom: 16, duration: 1 });
    } else if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map((loc) => [loc.latitude, loc.longitude])
      );
      map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 16, duration: 0.8 });
    }
  }, [locations, map, routeLine]);

  return null;
}

export function LocationMapPreview({
  locations,
  onClose,
  onNavigate,
}: LocationMapPreviewProps) {
  const [mapType, setMapType] = useState<MapType>("street");
  const [isNavigating, setIsNavigating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeLine, setRouteLine] = useState<[number, number][] | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const center =
    locations.length > 0
      ? { lat: locations[0].latitude, lng: locations[0].longitude }
      : { lat: 0, lng: 0 };

  const cycleMapType = () => {
    const types: MapType[] = ["street", "satellite", "hybrid"];
    const currentIndex = types.indexOf(mapType);
    setMapType(types[(currentIndex + 1) % types.length]);
  };

  const otherLocations = locations.filter((loc) => !loc.isCurrentUser);
  const targetLoc = selectedLocation || otherLocations[0] || locations[0];

  const calcDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const handleNavigate = useCallback(() => {
    if (!targetLoc) return;

    setIsLocating(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setUserLocation({ lat: userLat, lng: userLng });

        const routePoints: [number, number][] = [
          [userLat, userLng],
          [targetLoc.latitude, targetLoc.longitude],
        ];
        setRouteLine(routePoints);

        const dist = calcDistance(userLat, userLng, targetLoc.latitude, targetLoc.longitude);
        setDistance(dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`);

        setIsNavigating(true);
        setIsLocating(false);
        onNavigate?.(targetLoc.latitude, targetLoc.longitude);
      },
      () => {
        toast.error("Could not get your location. Please enable location access.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [targetLoc, calcDistance, onNavigate]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setRouteLine(null);
    setUserLocation(null);
    setDistance(null);
  }, []);

  const copyCoordinates = (lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    toast.success("Coordinates copied!");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-accent/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            {isNavigating ? (
              <Route className="w-4 h-4 text-primary" />
            ) : (
              <MapPin className="w-4 h-4 text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {isNavigating ? "Navigating" : "Location"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isNavigating && distance
                ? `${distance} away from ${targetLoc?.userName}`
                : locations.filter((l) => l.isLive).length > 0
                ? "Live sharing active"
                : "Shared location"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-destructive/10">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Full screen Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={15}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer attribution="&copy; Google Maps" url={GOOGLE_TILES[mapType]} />
          {(mapType === "satellite" || mapType === "hybrid") && (
            <TileLayer url="https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}" />
          )}
          <MapUpdater locations={locations} routeLine={routeLine} />

          {/* Accuracy circles */}
          {locations
            .filter((loc) => loc.isLive && loc.accuracy)
            .map((loc) => (
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

          {/* Location markers */}
          {locations.map((loc, index) => (
            <Marker
              key={`${loc.userId}-${index}`}
              position={[loc.latitude, loc.longitude]}
              icon={createMarkerIcon(!!loc.isCurrentUser, !!loc.isLive)}
            >
              <Popup className="custom-popup">
                <div className="text-center p-1 min-w-[120px]">
                  <p className="font-semibold">{loc.userName}</p>
                  {loc.isLive && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Live
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* User's current location marker */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={currentLocationIcon}>
              <Popup>
                <div className="text-center p-1">
                  <p className="font-semibold">You are here</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Route line */}
          {routeLine && routeLine.length >= 2 && (
            <Polyline
              positions={routeLine}
              pathOptions={{
                color: "#4285F4",
                weight: 4,
                opacity: 0.8,
                dashArray: "10, 10",
                lineCap: "round",
              }}
            />
          )}
        </MapContainer>

        {/* Map type toggle */}
        <Button
          onClick={cycleMapType}
          size="sm"
          variant="secondary"
          className="absolute top-3 right-3 z-[1000] shadow-lg bg-background/95 hover:bg-background text-foreground border"
        >
          <Layers className="w-4 h-4 mr-1" />
          <span className="capitalize text-xs">{mapType}</span>
        </Button>

        {/* Distance badge */}
        {isNavigating && distance && (
          <div className="absolute top-3 left-3 z-[1000] bg-primary text-primary-foreground px-3 py-1.5 rounded-full shadow-lg text-sm font-medium flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5" />
            {distance}
          </div>
        )}
      </div>

      {/* Bottom Navigation Panel */}
      <div className="bg-background border-t shrink-0 safe-area-bottom">
        {targetLoc && !targetLoc.isCurrentUser && (
          <>
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-mono">
                  {targetLoc.latitude.toFixed(6)}, {targetLoc.longitude.toFixed(6)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => copyCoordinates(targetLoc.latitude, targetLoc.longitude)}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="p-3 flex gap-2">
              {!isNavigating ? (
                <Button
                  onClick={handleNavigate}
                  disabled={isLocating}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md h-12 text-base font-medium"
                >
                  {isLocating ? (
                    <>
                      <Locate className="w-5 h-5 mr-2 animate-spin" />
                      Getting your location...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5 mr-2" />
                      Navigate to {targetLoc.userName}
                      {targetLoc.isLive && (
                        <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                          Live
                        </span>
                      )}
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleNavigate}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md h-12 text-sm font-medium"
                  >
                    <Locate className="w-4 h-4 mr-1.5" />
                    Refresh Route
                  </Button>
                  <Button
                    onClick={stopNavigation}
                    variant="outline"
                    className="h-12 px-4 border-destructive text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    Stop
                  </Button>
                </>
              )}
            </div>
          </>
        )}

        {otherLocations.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            This is your current location
          </p>
        )}
      </div>
    </div>
  );
}
