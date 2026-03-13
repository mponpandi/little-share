import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { X, Navigation, Layers, MapPin, Copy, Locate, Route, Clock, ArrowUp, Minus, Plus, ChevronUp, CornerUpRight } from "lucide-react";
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

const createDestinationIcon = () => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div class="relative">
        <svg width="44" height="54" viewBox="0 0 44 54" fill="none" xmlns="http://www.w3.org/2000/svg">
          <filter id="ds" x="-20%" y="-10%" width="140%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.35"/>
          </filter>
          <path d="M22 2C10.954 2 2 10.954 2 22c0 15 20 30 20 30s20-15 20-30C42 10.954 33.046 2 22 2z" fill="#EA4335" filter="url(#ds)"/>
          <circle cx="22" cy="20" r="9" fill="white"/>
          <circle cx="22" cy="20" r="4.5" fill="#EA4335"/>
        </svg>
      </div>
    `,
    iconSize: [44, 54],
    iconAnchor: [22, 54],
    popupAnchor: [0, -54],
  });
};

const createLocationIcon = (isCurrentUser: boolean, isLive: boolean) => {
  if (isCurrentUser) return createUserLocationIcon();
  const color = "#EA4335";
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

const createUserLocationIcon = () => L.divIcon({
  className: "current-loc-marker",
  html: `
    <div class="relative flex items-center justify-center" style="width:48px;height:48px;">
      <div class="absolute" style="width:44px;height:44px;border-radius:50%;background:rgba(66,133,244,0.12);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div class="absolute" style="width:28px;height:28px;border-radius:50%;background:rgba(66,133,244,0.08);"></div>
      <div style="width:18px;height:18px;border-radius:50%;background:#4285F4;border:3.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);position:relative;z-index:10;"></div>
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

const createNavArrowIcon = (heading: number) => L.divIcon({
  className: "nav-arrow-marker",
  html: `
    <div class="relative flex items-center justify-center" style="width:56px;height:56px;">
      <div class="absolute" style="width:52px;height:52px;border-radius:50%;background:rgba(66,133,244,0.12);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="width:46px;height:46px;border-radius:50%;background:#4285F4;border:3px solid white;box-shadow:0 4px 16px rgba(66,133,244,0.4);display:flex;align-items:center;justify-content:center;position:relative;z-index:10;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="transform:rotate(${heading}deg)">
          <path d="M12 2L4 20l8-4 8 4L12 2z" fill="white"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [56, 56],
  iconAnchor: [28, 28],
});

// Fetch actual road route from OSRM (free, no API key needed)
async function fetchRoute(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number
): Promise<{ coordinates: [number, number][]; distance: number; duration: number } | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      // OSRM returns [lng, lat], we need [lat, lng] for Leaflet
      const coordinates: [number, number][] = route.geometry.coordinates.map(
        (coord: [number, number]) => [coord[1], coord[0]]
      );
      return {
        coordinates,
        distance: route.distance, // in meters
        duration: route.duration, // in seconds
      };
    }
    return null;
  } catch (err) {
    console.error("OSRM routing error:", err);
    return null;
  }
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

// High accuracy location with fallback
function getHighAccuracyPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      () => {
        // Fallback to network-based
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: false, timeout: 30000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

function MapController({ locations, routeLine, isNavigating, userLocation }: { 
  locations: Location[]; 
  routeLine: [number, number][] | null;
  isNavigating: boolean;
  userLocation: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (isNavigating && routeLine && routeLine.length >= 2) {
      const bounds = L.latLngBounds(routeLine);
      map.flyToBounds(bounds, { padding: [100, 100], maxZoom: 16, duration: 1.2 });
    } else if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map((loc) => [loc.latitude, loc.longitude])
      );
      map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 16, duration: 0.8 });
    }
  }, [locations, map, routeLine, isNavigating]);

  return null;
}

function ZoomControls() {
  const map = useMap();
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-0 rounded-lg overflow-hidden shadow-lg border border-black/10">
      <button
        onClick={() => map.zoomIn()}
        className="w-10 h-10 bg-white flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <Plus className="w-5 h-5 text-gray-700" />
      </button>
      <div className="h-px bg-gray-200" />
      <button
        onClick={() => map.zoomOut()}
        className="w-10 h-10 bg-white flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <Minus className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  );
}

function RecenterButton({ userLocation }: { userLocation: { lat: number; lng: number } | null }) {
  const map = useMap();
  if (!userLocation) return null;
  return (
    <button
      onClick={() => map.flyTo([userLocation.lat, userLocation.lng], 17, { duration: 0.8 })}
      className="absolute bottom-4 right-3 z-[1000] w-11 h-11 bg-white rounded-full shadow-lg border border-black/10 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
      <Locate className="w-5 h-5 text-[#4285F4]" />
    </button>
  );
}

export function LocationMapPreview({
  locations,
  onClose,
  onNavigate,
}: LocationMapPreviewProps) {
  const [mapType, setMapType] = useState<MapType>("street");
  const [isNavigating, setIsNavigating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState(0);
  const [routeLine, setRouteLine] = useState<[number, number][] | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [routeError, setRouteError] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const routeUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const targetLoc = otherLocations[0] || locations[0];

  const calcBearing = useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }, []);

  // Fetch and update the road route
  const updateRoute = useCallback(async (userLat: number, userLng: number) => {
    if (!targetLoc) return;
    
    setHeading(calcBearing(userLat, userLng, targetLoc.latitude, targetLoc.longitude));
    
    const result = await fetchRoute(userLat, userLng, targetLoc.latitude, targetLoc.longitude);
    
    if (result) {
      setRouteLine(result.coordinates);
      setDistance(formatDistance(result.distance));
      setEta(formatDuration(result.duration));
      setRouteError(false);
    } else {
      // Fallback to straight line if routing fails
      setRouteLine([[userLat, userLng], [targetLoc.latitude, targetLoc.longitude]]);
      const R = 6371000;
      const dLat = ((targetLoc.latitude - userLat) * Math.PI) / 180;
      const dLng = ((targetLoc.longitude - userLng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLat * Math.PI / 180) * Math.cos(targetLoc.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const distMeters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      setDistance(formatDistance(distMeters));
      setEta(formatDuration(distMeters / 8.33)); // ~30 km/h fallback
      setRouteError(true);
    }
  }, [targetLoc, calcBearing]);

  const handleNavigate = useCallback(() => {
    if (!targetLoc) return;
    setIsLocating(true);

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported");
      setIsLocating(false);
      return;
    }

    getHighAccuracyPosition()
      .then(async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setUserLocation({ lat: userLat, lng: userLng });
        await updateRoute(userLat, userLng);
        setIsNavigating(true);
        setIsLocating(false);
        onNavigate?.(targetLoc.latitude, targetLoc.longitude);

        // Start watching position for live updates
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setUserLocation({ lat, lng });
            setHeading(calcBearing(lat, lng, targetLoc.latitude, targetLoc.longitude));
            
            // Throttle route API calls to every 15 seconds
            if (!routeUpdateTimer.current) {
              routeUpdateTimer.current = setTimeout(() => {
                updateRoute(lat, lng);
                routeUpdateTimer.current = null;
              }, 15000);
            }
          },
          (err) => {
            console.error("Watch position error:", err);
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
        );
      })
      .catch(() => {
        toast.error("Could not get your location. Please enable location access.");
        setIsLocating(false);
      });
  }, [targetLoc, updateRoute, onNavigate, calcBearing]);

  const stopNavigation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (routeUpdateTimer.current) {
      clearTimeout(routeUpdateTimer.current);
      routeUpdateTimer.current = null;
    }
    setIsNavigating(false);
    setRouteLine(null);
    setUserLocation(null);
    setDistance(null);
    setEta(null);
    setSheetExpanded(false);
    setRouteError(false);
  }, []);

  // Open in external map app
  const openInExternalApp = useCallback((app: "google" | "apple" | "waze") => {
    if (!targetLoc) return;
    const { latitude: lat, longitude: lng } = targetLoc;
    let url = "";
    switch (app) {
      case "google":
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        break;
      case "apple":
        url = `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
        break;
      case "waze":
        url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
        break;
    }
    window.open(url, "_blank");
  }, [targetLoc]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (routeUpdateTimer.current) {
        clearTimeout(routeUpdateTimer.current);
      }
    };
  }, []);

  const copyCoordinates = (lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    toast.success("Coordinates copied!");
  };

  // ---- NAVIGATION MODE ----
  if (isNavigating && targetLoc) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        {/* Navigation Map - Full screen */}
        <div className="flex-1 relative">
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={16}
            className="h-full w-full"
            zoomControl={false}
          >
            <TileLayer attribution="&copy; Google Maps" url={GOOGLE_TILES[mapType]} />
            {(mapType === "satellite" || mapType === "hybrid") && (
              <TileLayer url="https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}" />
            )}
            <MapController locations={locations} routeLine={routeLine} isNavigating={isNavigating} userLocation={userLocation} />
            <ZoomControls />
            <RecenterButton userLocation={userLocation} />

            {/* Route polyline - Google Maps blue */}
            {routeLine && routeLine.length >= 2 && (
              <>
                {/* Shadow line */}
                <Polyline
                  positions={routeLine}
                  pathOptions={{ color: "#185ABC", weight: 8, opacity: 0.3, lineCap: "round", lineJoin: "round" }}
                />
                {/* Main route line */}
                <Polyline
                  positions={routeLine}
                  pathOptions={{ color: "#4285F4", weight: 5, opacity: 1, lineCap: "round", lineJoin: "round" }}
                />
              </>
            )}

            {/* Destination marker */}
            <Marker
              position={[targetLoc.latitude, targetLoc.longitude]}
              icon={createDestinationIcon()}
            >
              <Popup>
                <div className="text-center p-1">
                  <p className="font-semibold">{targetLoc.userName}</p>
                </div>
              </Popup>
            </Marker>

            {/* User location with navigation arrow */}
            {userLocation && (
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={createNavArrowIcon(heading)}
              />
            )}
          </MapContainer>

          {/* Top bar - ETA info (Google Maps style) */}
          <div className="absolute top-0 left-0 right-0 z-[1000] safe-area-top">
            <div className="m-3 rounded-2xl overflow-hidden shadow-xl" style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)" }}>
              {/* Main ETA row */}
              <div className="flex items-center px-4 py-3">
                <div className="flex-1 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#4285F4] flex items-center justify-center shadow-md">
                    <Navigation className="w-5 h-5 text-white" style={{ transform: `rotate(${heading}deg)` }} />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#1a73e8]">{eta || "..."}</span>
                      <span className="text-sm text-gray-500">{distance}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      to {targetLoc.userName}{targetLoc.isLive ? " • Live" : ""}
                      {routeError && " • Straight line"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={stopNavigation}
                  className="rounded-full w-10 h-10 hover:bg-red-50"
                >
                  <X className="w-5 h-5 text-red-500" />
                </Button>
              </div>

              {/* Direction hint */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50/80 border-t border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-[#4285F4]/10 flex items-center justify-center">
                  <CornerUpRight className="w-4 h-4 text-[#4285F4]" />
                </div>
                <span className="text-sm text-gray-700">Follow the route to destination</span>
              </div>
            </div>
          </div>

          {/* Layer toggle */}
          <button
            onClick={cycleMapType}
            className="absolute bottom-20 left-3 z-[1000] w-11 h-11 bg-white rounded-full shadow-lg border border-black/10 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <Layers className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Bottom sheet - Google Maps style */}
        <div
          className="bg-white shrink-0 safe-area-bottom rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
          style={{ marginTop: "-16px", position: "relative", zIndex: 1001 }}
        >
          {/* Drag handle */}
          <div
            className="flex justify-center py-2 cursor-pointer"
            onClick={() => setSheetExpanded(!sheetExpanded)}
          >
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>

          {/* Compact info */}
          <div className="px-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#4285F4] flex items-center justify-center">
                <Navigation className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{targetLoc.userName}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{eta || "Calculating..."}</span>
                  <span>•</span>
                  <span>{distance || "..."}</span>
                </div>
              </div>
            </div>
            <button
              onClick={stopNavigation}
              className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full text-sm transition-colors shadow-md"
            >
              Stop
            </button>
          </div>

          {/* Expanded details */}
          {sheetExpanded && (
            <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 font-mono">
                  {targetLoc.latitude.toFixed(6)}, {targetLoc.longitude.toFixed(6)}
                </span>
                <button
                  onClick={() => copyCoordinates(targetLoc.latitude, targetLoc.longitude)}
                  className="ml-auto p-1.5 rounded-md hover:bg-gray-100"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
              {targetLoc.isLive && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live location sharing active
                </div>
              )}
              
              {/* Open in external app buttons */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">Open in Maps App</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => openInExternalApp("google")}
                    className="flex-1 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Google Maps
                  </button>
                  <button
                    onClick={() => openInExternalApp("apple")}
                    className="flex-1 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Apple Maps
                  </button>
                  <button
                    onClick={() => openInExternalApp("waze")}
                    className="flex-1 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Waze
                  </button>
                </div>
              </div>

              <button
                onClick={handleNavigate}
                className="w-full py-2.5 text-[#4285F4] font-medium text-sm rounded-lg border border-[#4285F4]/20 hover:bg-[#4285F4]/5 transition-colors flex items-center justify-center gap-2"
              >
                <Locate className="w-4 h-4" />
                Refresh Route
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- DEFAULT VIEW (Pre-navigation) ----
  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b shrink-0 safe-area-top">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h3 className="font-semibold text-gray-900">
              {targetLoc?.userName ? `${targetLoc.userName}'s Location` : "Location"}
            </h3>
            <p className="text-xs text-gray-500">
              {locations.filter((l) => l.isLive).length > 0 ? "Live sharing active" : "Shared location"}
            </p>
          </div>
        </div>
        <button
          onClick={cycleMapType}
          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <Layers className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Map */}
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
          <MapController locations={locations} routeLine={null} isNavigating={false} userLocation={null} />
          <ZoomControls />

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
                  fillOpacity: 0.12,
                  weight: 1,
                }}
              />
            ))}

          {/* Location markers */}
          {locations.map((loc, index) => (
            <Marker
              key={`${loc.userId}-${index}`}
              position={[loc.latitude, loc.longitude]}
              icon={createLocationIcon(!!loc.isCurrentUser, !!loc.isLive)}
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
        </MapContainer>
      </div>

      {/* Bottom panel - Google Maps style */}
      {targetLoc && !targetLoc.isCurrentUser && (
        <div className="bg-white border-t shrink-0 safe-area-bottom rounded-t-2xl shadow-[0_-2px_10px_rgba(0,0,0,0.08)]" style={{ marginTop: "-12px", position: "relative", zIndex: 1001 }}>
          <div className="flex justify-center py-1.5">
            <div className="w-8 h-1 rounded-full bg-gray-300" />
          </div>

          {/* Location info */}
          <div className="px-4 pb-2">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mt-0.5 shrink-0">
                <MapPin className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{targetLoc.userName}</p>
                <p className="text-sm text-gray-500 font-mono truncate">
                  {targetLoc.latitude.toFixed(6)}, {targetLoc.longitude.toFixed(6)}
                </p>
              </div>
              <button
                onClick={() => copyCoordinates(targetLoc.latitude, targetLoc.longitude)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors shrink-0"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Navigate button */}
          <div className="px-4 pb-4 pt-1">
            <button
              onClick={handleNavigate}
              disabled={isLocating}
              className="w-full h-13 py-3.5 bg-[#4285F4] hover:bg-[#3367d6] disabled:bg-[#4285F4]/60 text-white font-semibold rounded-full text-base transition-colors shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2.5"
            >
              {isLocating ? (
                <>
                  <Locate className="w-5 h-5 animate-spin" />
                  Getting your location...
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  Start Navigation
                  {targetLoc.isLive && (
                    <span className="ml-1 px-2 py-0.5 bg-white/20 text-xs rounded-full">Live</span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {otherLocations.length === 0 && (
        <div className="bg-white border-t p-4 safe-area-bottom">
          <p className="text-center text-sm text-gray-500">This is your current location</p>
        </div>
      )}
    </div>
  );
}
