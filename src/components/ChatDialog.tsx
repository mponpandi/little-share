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
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

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

function DateSeparator({ date }: { date: string }) {
  const d = new Date(date);
  let label: string;
  if (isToday(d)) label = "Today";
  else if (isYesterday(d)) label = "Yesterday";
  else label = format(d, "MMMM d, yyyy");

  return (
    <div className="flex items-center justify-center my-4">
      <span className="px-3 py-1 bg-muted/80 text-muted-foreground text-[11px] rounded-full font-medium">
        {label}
      </span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex items-center gap-2 px-4 py-1"
    >
      <div className="flex gap-1 px-3 py-2 bg-card border border-border rounded-2xl rounded-bl-sm">
        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </motion.div>
  );
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
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === newMsg.id);
              if (exists) return prev;
              return [...prev, newMsg];
            });
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
      setMessages(
        (data || []).map((m) => ({
          ...m,
          location_data: m.location_data as unknown as LocationData | null,
        }))
      );
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

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      request_id: requestId,
      sender_id: currentUserId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      is_read: false,
      message_type: "text",
      media_url: null,
      location_data: null,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setIsSending(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        request_id: requestId,
        sender_id: currentUserId,
        content: content.trim(),
        message_type: "text",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } else if (data) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...data,
                location_data:
                  data.location_data as unknown as LocationData | null,
              }
            : m
        )
      );
    }
    setIsSending(false);
  };

  const handleSendImage = async (file: File) => {
    if (isSending) return;

    setIsSending(true);
    const tempId = `temp-img-${Date.now()}`;
    const tempUrl = URL.createObjectURL(file);

    // Optimistic image message
    const optimisticMessage: Message = {
      id: tempId,
      request_id: requestId,
      sender_id: currentUserId,
      content: "",
      created_at: new Date().toISOString(),
      is_read: false,
      message_type: "image",
      media_url: tempUrl,
      location_data: null,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

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

      const { data, error } = await supabase
        .from("messages")
        .insert({
          request_id: requestId,
          sender_id: currentUserId,
          content: "",
          message_type: "image",
          media_url: publicUrl,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...data,
                  location_data:
                    data.location_data as unknown as LocationData | null,
                }
              : m
          )
        );
      }
    } catch (err) {
      console.error("Error sending image:", err);
      toast.error("Failed to send image");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      URL.revokeObjectURL(tempUrl);
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
        } else {
          toast.success("Location shared");
        }
      },
      () => {
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

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Group messages with date separators
  const renderMessages = () => {
    const elements: React.ReactNode[] = [];
    let lastDate: Date | null = null;

    messages.forEach((msg) => {
      const msgDate = new Date(msg.created_at);
      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        elements.push(
          <DateSeparator key={`date-${msg.created_at}`} date={msg.created_at} />
        );
        lastDate = msgDate;
      }

      const isOwn = msg.sender_id === currentUserId;
      const senderProfile = profiles[msg.sender_id];
      const locationData = msg.location_data as {
        latitude: number;
        longitude: number;
        address?: string;
      } | null;

      elements.push(
        <ChatMessage
          key={msg.id}
          content={msg.content}
          isOwn={isOwn}
          timestamp={msg.created_at}
          isRead={msg.is_read}
          senderName={
            isOwn ? "You" : senderProfile?.full_name || otherUserName
          }
          senderAvatar={senderProfile?.avatar_url || undefined}
          messageType={
            msg.message_type as "text" | "image" | "location" | "live_location"
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
    });

    return elements;
  };

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

          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="p-4 min-h-full flex flex-col justify-end">
              {isLoading ? (
                <div className="flex items-center justify-center flex-1">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <span className="text-2xl">💬</span>
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">
                    No messages yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start the conversation about{" "}
                    <span className="font-medium text-foreground">
                      {itemName}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {renderMessages()}
                </div>
              )}
              <div ref={scrollEndRef} />
            </div>
          </div>

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
