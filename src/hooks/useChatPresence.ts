import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PresenceData {
  isOnline: boolean;
  lastSeen: string | null;
}

export function useChatPresence(requestId: string, currentUserId: string) {
  const [otherUserPresence, setOtherUserPresence] = useState<PresenceData>({
    isOnline: false,
    lastSeen: null,
  });

  // Update current user's presence
  const updatePresence = useCallback(
    async (isOnline: boolean) => {
      if (!requestId || !currentUserId) return;

      try {
        const { error } = await supabase.from("chat_presence").upsert(
          {
            user_id: currentUserId,
            request_id: requestId,
            is_online: isOnline,
            last_seen: new Date().toISOString(),
          },
          { onConflict: "user_id,request_id" }
        );

        if (error) {
          console.error("Error updating presence:", error);
        }
      } catch (err) {
        console.error("Failed to update presence:", err);
      }
    },
    [requestId, currentUserId]
  );

  // Fetch and subscribe to other user's presence
  useEffect(() => {
    if (!requestId || !currentUserId) return;

    const fetchPresence = async () => {
      const { data } = await supabase
        .from("chat_presence")
        .select("*")
        .eq("request_id", requestId)
        .neq("user_id", currentUserId)
        .single();

      if (data) {
        setOtherUserPresence({
          isOnline: data.is_online,
          lastSeen: data.last_seen,
        });
      }
    };

    fetchPresence();

    // Subscribe to presence changes
    const channel = supabase
      .channel(`presence:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_presence",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          const data = payload.new as any;
          if (data && data.user_id !== currentUserId) {
            setOtherUserPresence({
              isOnline: data.is_online,
              lastSeen: data.last_seen,
            });
          }
        }
      )
      .subscribe();

    // Set current user as online
    updatePresence(true);

    // Handle visibility change
    const handleVisibilityChange = () => {
      updatePresence(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      updatePresence(false);
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [requestId, currentUserId, updatePresence]);

  return {
    otherUserPresence,
    updatePresence,
  };
}
