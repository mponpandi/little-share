import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ChatMessage } from "./chat/ChatMessage";
import { ChatHeader } from "./chat/ChatHeader";
import { ChatInput } from "./chat/ChatInput";
import { LocationMapPreview } from "./chat/LocationMapPreview";
import { useChatPresence } from "@/hooks/useChatPresence";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { formatDistanceToNow } from "date-fns";

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  message_type: string;
  media_url: string | null;
  location_data: LocationData | null;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  itemName?: string;
  otherUserName?: string;
  otherUserAvatar?: string;
  currentUserId: string;
}

export function ChatDialog({
  open,
  onOpenChange,
  requestId,
  itemName = "Item",
  otherUserName = "User",
  otherUserAvatar,
  currentUserId,
}: ChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [mapLocations, setMapLocations] = useState<
    Array<{
      userId: string;
      userName: string;
      latitude: number;
      longitude: number;
      isLive?: boolean;
      isCurrentUser?: boolean;
    }>
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { otherUserPresence } = useChatPresence(
    open ? requestId : "",
    currentUserId
  );
  const {
    isSharing: isLiveSharing,
    otherUserLocation,
    currentLocation,
    startSharing,
    stopSharing,
  } = useLiveLocation(open ? requestId : "", currentUserId);

  // Fetch profiles for messages
  const fetchProfiles = useCallback(async (userIds: string[]) => {
    const uniqueIds = [...new Set(userIds)];
    const missingIds = uniqueIds.filter((id) => !profiles[id]);

    if (missingIds.length === 0) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", missingIds);

    if (data) {
      setProfiles((prev) => {
        const updated = { ...prev };
        data.forEach((profile) => {
          updated[profile.id] = profile;
        });
        return updated;
      });
    }
  }, [profiles]);

  useEffect(() => {
    if (open && requestId) {
      fetchMessages();
      markMessagesAsRead();

      const channel = supabase
        .channel(`messages:${requestId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `request_id=eq.${requestId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => [...prev, newMsg]);
            fetchProfiles([newMsg.sender_id]);
            if (newMsg.sender_id !== currentUserId) {
              markMessagesAsRead();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `request_id=eq.${requestId}`,
          },
          (payload) => {
            const updatedMsg = payload.new as Message;
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, requestId, currentUserId]);

  const fetchMessages = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      setMessages((data || []).map(m => ({
        ...m,
        location_data: m.location_data as unknown as LocationData | null
      })));
      const userIds = (data || []).map((m) => m.sender_id);
      if (userIds.length > 0) {
        fetchProfiles(userIds);
      }
    }
    setIsLoading(false);
  };

  const markMessagesAsRead = async () => {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("request_id", requestId)
      .neq("sender_id", currentUserId);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isSending) return;

    setIsSending(true);
    const { error } = await supabase.from("messages").insert({
      request_id: requestId,
      sender_id: currentUserId,
      content: content.trim(),
      message_type: "text",
    });

    if (error) {
      toast.error("Failed to send message");
      console.error("Error sending message:", error);
    }
    setIsSending(false);
  };

  const handleSendImage = async (file: File) => {
    if (isSending) return;

    setIsSending(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("chat-media").getPublicUrl(fileName);

      const { error } = await supabase.from("messages").insert({
        request_id: requestId,
        sender_id: currentUserId,
        content: "",
        message_type: "image",
        media_url: publicUrl,
      });

      if (error) throw error;
    } catch (err) {
      console.error("Error sending image:", err);
      toast.error("Failed to send image");
    }
    setIsSending(false);
  };

  const handleShareLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        const { error } = await supabase.from("messages").insert({
          request_id: requestId,
          sender_id: currentUserId,
          content: "Shared location",
          message_type: "location",
          location_data: locationData,
        });

        if (error) {
          toast.error("Failed to share location");
          console.error("Error sharing location:", error);
        } else {
          toast.success("Location shared");
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Failed to get your location");
      }
    );
  };

  const handleStartLiveLocation = async () => {
    if (isLiveSharing) {
      await stopSharing();
    } else {
      const success = await startSharing(60);
      if (success) {
        await supabase.from("messages").insert({
          request_id: requestId,
          sender_id: currentUserId,
          content: "Started sharing live location",
          message_type: "live_location",
          location_data: currentLocation
            ? { latitude: currentLocation.lat, longitude: currentLocation.lng }
            : null,
        });
      }
    }
  };

  const handleLocationClick = (lat: number, lng: number) => {
    const locations: Array<{
      userId: string;
      userName: string;
      latitude: number;
      longitude: number;
      isLive?: boolean;
      isCurrentUser?: boolean;
    }> = [
      {
        userId: "clicked",
        userName: "Location",
        latitude: lat,
        longitude: lng,
      },
    ];

    if (otherUserLocation && otherUserLocation.isSharing) {
      locations.push({
        userId: otherUserLocation.userId,
        userName: otherUserName,
        latitude: otherUserLocation.latitude,
        longitude: otherUserLocation.longitude,
        isLive: true,
      });
    }

    if (currentLocation && isLiveSharing) {
      locations.push({
        userId: currentUserId,
        userName: "You",
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        isLive: true,
        isCurrentUser: true,
      });
    }

    setMapLocations(locations);
    setShowLocationMap(true);
  };

  const lastSeen = otherUserPresence.lastSeen
    ? formatDistanceToNow(new Date(otherUserPresence.lastSeen), {
        addSuffix: true,
      })
    : null;

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-full max-w-full max-h-full sm:max-w-full sm:max-h-full rounded-none flex flex-col p-0 gap-0 overflow-hidden">
          <ChatHeader
            otherUserName={otherUserName}
            otherUserAvatar={otherUserAvatar}
            itemName={itemName}
            isOnline={otherUserPresence.isOnline}
            lastSeen={lastSeen || undefined}
            onBack={() => onOpenChange(false)}
            onShareLocation={handleShareLocation}
            onStartLiveLocation={handleStartLiveLocation}
            isLiveSharing={isLiveSharing}
          />

          <ScrollArea className="flex-1 overflow-hidden" ref={scrollRef}>
            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-[60vh]">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <span className="text-2xl">💬</span>
                  </div>
                  <p className="text-muted-foreground text-sm">No messages yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start the conversation!
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId;
                    const senderProfile = profiles[msg.sender_id];
                    const locationData = msg.location_data as {
                      latitude: number;
                      longitude: number;
                      address?: string;
                    } | null;

                    return (
                      <ChatMessage
                        key={msg.id}
                        content={msg.content}
                        isOwn={isOwn}
                        timestamp={msg.created_at}
                        isRead={msg.is_read}
                        senderName={
                          isOwn
                            ? "You"
                            : senderProfile?.full_name || otherUserName
                        }
                        senderAvatar={senderProfile?.avatar_url || undefined}
                        messageType={
                          msg.message_type as
                            | "text"
                            | "image"
                            | "location"
                            | "live_location"
                        }
                        mediaUrl={msg.media_url || undefined}
                        locationData={
                          locationData
                            ? {
                                latitude: locationData.latitude,
                                longitude: locationData.longitude,
                                isLive: msg.message_type === "live_location",
                                address: locationData.address,
                              }
                            : undefined
                        }
                        onLocationClick={handleLocationClick}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          <ChatInput
            onSendMessage={handleSendMessage}
            onSendImage={handleSendImage}
            onShareLocation={handleShareLocation}
            isSending={isSending}
          />
        </DialogContent>
      </Dialog>

      {showLocationMap && (
        <LocationMapPreview
          locations={mapLocations}
          onClose={() => setShowLocationMap(false)}
        />
      )}
    </>
  );
}
