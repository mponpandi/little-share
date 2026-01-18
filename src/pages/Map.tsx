import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Layers,
  List,
  Map as MapIcon,
  Shirt,
  BookOpen,
  Smartphone,
  Gift,
  Crosshair,
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Item = Database["public"]["Tables"]["items"]["Row"] & {
  profiles?: { full_name: string } | null;
};

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Enhanced custom marker icons with better styling and shadow
const createCategoryIcon = (emoji: string, bgColor: string) => new L.DivIcon({
  html: `
    <div class="relative">
      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-black/20 rounded-full blur-sm"></div>
      <div class="w-12 h-12 rounded-full ${bgColor} flex items-center justify-center shadow-xl border-3 border-white transform transition-transform hover:scale-110 animate-bounce-once">
        <span class="text-xl">${emoji}</span>
      </div>
      <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-white"></div>
    </div>
  `,
  className: "custom-marker-enhanced",
  iconSize: [48, 56],
  iconAnchor: [24, 56],
  popupAnchor: [0, -56],
});

const categoryIcons: Record<string, L.DivIcon> = {
  clothing: createCategoryIcon("👕", "bg-purple-500"),
  school_supplies: createCategoryIcon("📚", "bg-teal-500"),
  electronics: createCategoryIcon("📱", "bg-amber-500"),
  other: createCategoryIcon("🎁", "bg-rose-500"),
};

// Enhanced user location marker - Google Maps blue dot style
const userLocationIcon = new L.DivIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping"></div>
      <div class="absolute w-6 h-6 bg-blue-500/20 rounded-full animate-pulse"></div>
      <div class="relative w-4 h-4 bg-blue-500 rounded-full border-3 border-white shadow-lg z-10"></div>
    </div>
  `,
  className: "user-location-marker",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const distanceFilters = [
  { value: 1, label: "1 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 50, label: "50 km" },
];

// Enhanced map controller with smooth fly-to animation
function MapController({ lat, lng, shouldCenter, onCentered }: { 
  lat: number; 
  lng: number; 
  shouldCenter: boolean;
  onCentered: () => void;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (map && shouldCenter) {
      map.flyTo([lat, lng], 15, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
      onCentered();
    }
  }, [lat, lng, shouldCenter, map, onCentered]);
  
  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [selectedDistance, setSelectedDistance] = useState(10);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isListView, setIsListView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [shouldCenterMap, setShouldCenterMap] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchItems();
        startLocationTracking();
      }
    });
    
    return () => {
      // Clean up location tracking on unmount
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [navigate]);

  // Start real-time location tracking
  const startLocationTracking = useCallback(() => {
    setLocationLoading(true);
    if ("geolocation" in navigator) {
      // Initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          setShouldCenterMap(true);
          setLocationLoading(false);
          setIsTracking(true);
        },
        (error) => {
          console.log("Geolocation error:", error.message);
          setUserLocation({ lat: 20.5937, lng: 78.9629, accuracy: 0 });
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );

      // Continuous tracking
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          setIsTracking(true);
        },
        (error) => {
          console.log("Watch position error:", error.message);
          setIsTracking(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    } else {
      setUserLocation({ lat: 20.5937, lng: 78.9629, accuracy: 0 });
      setLocationLoading(false);
    }
  }, []);

  const centerOnUser = useCallback(() => {
    setLocationLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          setShouldCenterMap(true);
          setLocationLoading(false);
        },
        (error) => {
          console.log("Geolocation error:", error.message);
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    }
  }, []);

  const handleCentered = useCallback(() => {
    setShouldCenterMap(false);
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("items")
      .select(`*, profiles:donor_id(full_name)`)
      .eq("is_available", true)
      .not("pickup_latitude", "is", null)
      .not("pickup_longitude", "is", null);

    if (data) {
      setItems(data as Item[]);
    }
    setIsLoading(false);
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter items by distance
  const filteredItems = useMemo(() => {
    if (!userLocation) return items;
    return items.filter((item) => {
      if (!item.pickup_latitude || !item.pickup_longitude) return false;
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        item.pickup_latitude,
        item.pickup_longitude
      );
      return distance <= selectedDistance;
    });
  }, [items, userLocation, selectedDistance]);

  // Sort items by distance for list view
  const sortedItems = useMemo(() => {
    if (!userLocation) return filteredItems;
    return [...filteredItems].sort((a, b) => {
      const distA = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        a.pickup_latitude!,
        a.pickup_longitude!
      );
      const distB = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        b.pickup_latitude!,
        b.pickup_longitude!
      );
      return distA - distB;
    });
  }, [filteredItems, userLocation]);

  const getItemDistance = (item: Item): string => {
    if (!userLocation || !item.pickup_latitude || !item.pickup_longitude) return "";
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      item.pickup_latitude,
      item.pickup_longitude
    );
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  };

  // Use Google-like tiles: Maptiler Streets for street view (very similar to Google Maps)
  // For satellite: use ESRI World Imagery + ESRI Reference overlay (better labels)
  const streetTileUrl = "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
  const satelliteTileUrl = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
  const hybridLabelsUrl = "https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}";
  
  const tileUrl = isSatellite ? satelliteTileUrl : streetTileUrl;
  const tileAttribution = '&copy; <a href="https://www.google.com/maps">Google Maps</a>';

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="gradient-accent p-4 rounded-b-[1.5rem] z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="bg-white/10 hover:bg-white/20 text-white rounded-full"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-white font-heading font-bold text-xl">Nearby Donations</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full ${isListView ? "bg-white/20" : "bg-white/10"} text-white`}
              onClick={() => setIsListView(!isListView)}
            >
              {isListView ? <MapIcon className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Distance filters */}
        <div className="flex items-center space-x-2 mt-3 overflow-x-auto pb-1">
          {distanceFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={selectedDistance === filter.value ? "default" : "ghost"}
              size="sm"
              className={`rounded-full flex-shrink-0 ${
                selectedDistance === filter.value
                  ? "bg-white text-teal"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
              onClick={() => setSelectedDistance(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
          <div className="flex items-center space-x-2 ml-auto pl-2">
            <Layers className="w-4 h-4 text-white/70" />
            <Switch
              checked={isSatellite}
              onCheckedChange={setIsSatellite}
              className="data-[state=checked]:bg-white/30"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {isListView ? (
          <div className="p-4 space-y-3 overflow-auto h-full pb-4">
            {sortedItems.length === 0 ? (
              <Card className="border-0 shadow-card">
                <CardContent className="p-8 text-center">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No donations found within {selectedDistance}km</p>
                </CardContent>
              </Card>
            ) : (
              sortedItems.map((item) => (
                <Card
                  key={item.id}
                  className="border-0 shadow-card cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => navigate(`/item/${item.id}`)}
                >
                  <CardContent className="p-0">
                    <div className="flex">
                      <div className="w-24 h-24 bg-muted flex-shrink-0 rounded-l-lg">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover rounded-l-lg"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">
                            {item.category === "clothing" && "👕"}
                            {item.category === "school_supplies" && "📚"}
                            {item.category === "electronics" && "📱"}
                            {item.category === "other" && "🎁"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-3">
                        <h3 className="font-semibold line-clamp-1">{item.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(item.profiles as { full_name: string } | null)?.full_name || "Anonymous"}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge className="bg-primary/10 text-primary">
                            {item.category.replace("_", " ")}
                          </Badge>
                          <span className="text-sm font-medium text-teal flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {getItemDistance(item)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          userLocation && (
            <MapContainer
              center={[userLocation.lat, userLocation.lng]}
              zoom={13}
              className="h-full w-full z-0"
              zoomControl={false}
            >
              <TileLayer url={tileUrl} attribution={tileAttribution} />
              {/* Add hybrid labels overlay for satellite view - shows roads, places, and boundaries */}
              {isSatellite && (
                <TileLayer
                  url={hybridLabelsUrl}
                  attribution=""
                  zIndex={1000}
                />
              )}
              <MapController 
                lat={userLocation.lat} 
                lng={userLocation.lng} 
                shouldCenter={shouldCenterMap}
                onCentered={handleCentered}
              />
              
              {/* Accuracy circle - Google Maps style blue circle */}
              {userLocation.accuracy && userLocation.accuracy > 0 && (
                <Circle
                  center={[userLocation.lat, userLocation.lng]}
                  radius={userLocation.accuracy}
                  pathOptions={{
                    color: '#4285F4',
                    fillColor: '#4285F4',
                    fillOpacity: 0.15,
                    weight: 1,
                  }}
                />
              )}
              
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold">You are here</p>
                    {userLocation.accuracy && (
                      <p className="text-xs text-muted-foreground">
                        Accuracy: ~{Math.round(userLocation.accuracy)}m
                      </p>
                    )}
                    {isTracking && (
                      <p className="text-xs text-green-600 flex items-center justify-center gap-1 mt-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Live tracking
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
              {filteredItems.map((item) => (
                <Marker
                  key={item.id}
                  position={[item.pickup_latitude!, item.pickup_longitude!]}
                  icon={categoryIcons[item.category] || categoryIcons.other}
                >
                  <Popup>
                    <div
                      className="cursor-pointer min-w-[180px]"
                      onClick={() => navigate(`/item/${item.id}`)}
                    >
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-24 object-cover rounded-t mb-2"
                        />
                      )}
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {(item.profiles as { full_name: string } | null)?.full_name || "Anonymous"}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {item.category.replace("_", " ")}
                        </span>
                        <span className="text-xs font-medium text-teal">{getItemDistance(item)}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )
        )}

        {/* Floating locate button */}
        {!isListView && (
          <Button
            size="icon"
            className={`absolute bottom-6 right-4 z-[1000] w-12 h-12 rounded-full shadow-lg transition-all ${
              isTracking ? "bg-blue-500 hover:bg-blue-600" : "gradient-primary"
            }`}
            onClick={centerOnUser}
            disabled={locationLoading}
          >
            <Crosshair className={`w-5 h-5 text-white ${locationLoading ? "animate-spin" : ""}`} />
          </Button>
        )}

        {/* Items count badge */}
        <div className="absolute top-4 left-4 z-[1000]">
          <Badge className="bg-card shadow-card text-foreground px-3 py-1.5">
            {filteredItems.length} donation{filteredItems.length !== 1 ? "s" : ""} nearby
          </Badge>
        </div>
      </div>
    </div>
  );
}