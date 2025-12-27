import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
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

// Custom marker icons for categories
const categoryIcons: Record<string, L.DivIcon> = {
  clothing: new L.DivIcon({
    html: `<div class="w-10 h-10 rounded-full bg-purple flex items-center justify-center shadow-lg border-2 border-white"><span class="text-white text-lg">👕</span></div>`,
    className: "custom-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  }),
  school_supplies: new L.DivIcon({
    html: `<div class="w-10 h-10 rounded-full bg-teal flex items-center justify-center shadow-lg border-2 border-white"><span class="text-white text-lg">📚</span></div>`,
    className: "custom-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  }),
  electronics: new L.DivIcon({
    html: `<div class="w-10 h-10 rounded-full bg-gold flex items-center justify-center shadow-lg border-2 border-white"><span class="text-white text-lg">📱</span></div>`,
    className: "custom-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  }),
  other: new L.DivIcon({
    html: `<div class="w-10 h-10 rounded-full bg-coral flex items-center justify-center shadow-lg border-2 border-white"><span class="text-white text-lg">🎁</span></div>`,
    className: "custom-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  }),
};

// User location marker
const userLocationIcon = new L.DivIcon({
  html: `<div class="w-6 h-6 rounded-full bg-primary border-4 border-white shadow-lg animate-pulse"></div>`,
  className: "custom-marker",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const distanceFilters = [
  { value: 1, label: "1 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 50, label: "50 km" },
];

// Component to recenter map
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedDistance, setSelectedDistance] = useState(10);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isListView, setIsListView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchItems();
        detectLocation();
      }
    });
  }, [navigate]);

  const detectLocation = () => {
    setLocationLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationLoading(false);
        },
        () => {
          // Default to a central location if geolocation fails
          setUserLocation({ lat: 20.5937, lng: 78.9629 }); // India center
          setLocationLoading(false);
        }
      );
    } else {
      setUserLocation({ lat: 20.5937, lng: 78.9629 });
      setLocationLoading(false);
    }
  };

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

  const tileUrl = isSatellite
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const tileAttribution = isSatellite
    ? "Tiles &copy; Esri"
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

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

              {/* Recenter on location change */}
              <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />

              {/* User location marker */}
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold">You are here</p>
                  </div>
                </Popup>
              </Marker>

              {/* Item markers */}
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
            className="absolute bottom-6 right-4 z-[1000] w-12 h-12 rounded-full shadow-lg gradient-primary"
            onClick={detectLocation}
            disabled={locationLoading}
          >
            <Navigation className={`w-5 h-5 text-white ${locationLoading ? "animate-spin" : ""}`} />
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