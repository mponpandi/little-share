import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LiveLocation {
  userId: string;
  latitude: number;
  longitude: number;
  isSharing: boolean;
  expiresAt: string;
}

export function useLiveLocation(requestId: string, currentUserId: string) {
  const [isSharing, setIsSharing] = useState(false);
  const [otherUserLocation, setOtherUserLocation] = useState<LiveLocation | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Fetch existing live locations
  useEffect(() => {
    if (!requestId || !currentUserId) return;

    const fetchLiveLocations = async () => {
      const { data } = await supabase
        .from("live_locations")
        .select("*")
        .eq("request_id", requestId)
        .eq("is_sharing", true)
        .gte("expires_at", new Date().toISOString());

      if (data) {
        data.forEach((loc) => {
          if (loc.user_id === currentUserId) {
            setIsSharing(true);
          } else {
            setOtherUserLocation({
              userId: loc.user_id,
              latitude: loc.latitude,
              longitude: loc.longitude,
              isSharing: loc.is_sharing,
              expiresAt: loc.expires_at,
            });
          }
        });
      }
    };

    fetchLiveLocations();

    // Subscribe to live location updates
    const channel = supabase
      .channel(`live_location:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_locations",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          const data = payload.new as any;
          const eventType = payload.eventType;

          if (eventType === "DELETE") {
            const oldData = payload.old as any;
            if (oldData.user_id !== currentUserId) {
              setOtherUserLocation(null);
            }
            return;
          }

          if (data && data.user_id !== currentUserId) {
            if (!data.is_sharing || new Date(data.expires_at) < new Date()) {
              setOtherUserLocation(null);
            } else {
              setOtherUserLocation({
                userId: data.user_id,
                latitude: data.latitude,
                longitude: data.longitude,
                isSharing: data.is_sharing,
                expiresAt: data.expires_at,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, currentUserId]);

  // Start sharing live location
  const startSharing = useCallback(
    async (durationMinutes: number = 60) => {
      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your browser");
        return false;
      }

      return new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const expiresAt = new Date(
              Date.now() + durationMinutes * 60 * 1000
            ).toISOString();

            const { error } = await supabase.from("live_locations").upsert(
              {
                user_id: currentUserId,
                request_id: requestId,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                is_sharing: true,
                expires_at: expiresAt,
              },
              { onConflict: "user_id,request_id" }
            );

            if (error) {
              console.error("Error starting live location:", error);
              toast.error("Failed to start location sharing");
              resolve(false);
              return;
            }

            setIsSharing(true);
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });

            // Start watching position
            watchIdRef.current = navigator.geolocation.watchPosition(
              async (pos) => {
                setCurrentLocation({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                });

                await supabase
                  .from("live_locations")
                  .update({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                  })
                  .eq("user_id", currentUserId)
                  .eq("request_id", requestId);
              },
              (err) => console.error("Location watch error:", err),
              { enableHighAccuracy: true, maximumAge: 5000 }
            );

            toast.success("Live location sharing started");
            resolve(true);
          },
          (error) => {
            console.error("Geolocation error:", error);
            toast.error("Failed to get your location");
            resolve(false);
          },
          { enableHighAccuracy: true }
        );
      });
    },
    [requestId, currentUserId]
  );

  // Stop sharing live location
  const stopSharing = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const { error } = await supabase
      .from("live_locations")
      .update({ is_sharing: false })
      .eq("user_id", currentUserId)
      .eq("request_id", requestId);

    if (error) {
      console.error("Error stopping live location:", error);
      toast.error("Failed to stop location sharing");
      return;
    }

    setIsSharing(false);
    setCurrentLocation(null);
    toast.success("Live location sharing stopped");
  }, [requestId, currentUserId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isSharing,
    otherUserLocation,
    currentLocation,
    startSharing,
    stopSharing,
  };
}
