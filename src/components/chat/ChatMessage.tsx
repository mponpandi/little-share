import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCheck, MapPin, Navigation } from "lucide-react";
import { format } from "date-fns";

interface LocationData {
  latitude: number;
  longitude: number;
  isLive?: boolean;
  address?: string;
}

interface ChatMessageProps {
  content: string;
  isOwn: boolean;
  timestamp: string;
  isRead: boolean;
  senderName: string;
  senderAvatar?: string;
  messageType: "text" | "image" | "location" | "live_location";
  mediaUrl?: string;
  locationData?: LocationData;
  onLocationClick?: (lat: number, lng: number) => void;
}

export function ChatMessage({
  content,
  isOwn,
  timestamp,
  isRead,
  senderName,
  senderAvatar,
  messageType,
  mediaUrl,
  locationData,
  onLocationClick,
}: ChatMessageProps) {
  const initials = senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const renderContent = () => {
    switch (messageType) {
      case "image":
        return (
          <div className="relative">
            <img
              src={mediaUrl}
              alt="Shared image"
              className="rounded-lg max-w-[200px] max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => mediaUrl && window.open(mediaUrl, "_blank")}
            />
            {content && <p className="text-sm mt-2">{content}</p>}
          </div>
        );

      case "location":
      case "live_location":
        return (
          <button
            onClick={() =>
              locationData &&
              onLocationClick?.(locationData.latitude, locationData.longitude)
            }
            className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-teal-500/10 to-mint-500/10 hover:from-teal-500/20 hover:to-mint-500/20 transition-colors w-full text-left"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                messageType === "live_location"
                  ? "gradient-primary animate-pulse-soft"
                  : "bg-accent/20"
              }`}
            >
              {messageType === "live_location" ? (
                <Navigation className="w-5 h-5 text-primary-foreground" />
              ) : (
                <MapPin className="w-5 h-5 text-accent" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                {messageType === "live_location"
                  ? "Live Location"
                  : "Location Shared"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {locationData?.address || "Tap to view on map"}
              </p>
            </div>
          </button>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap break-words">{content}</p>;
    }
  };

  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {!isOwn && (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={senderAvatar} alt={senderName} />
          <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={`max-w-[75%] ${
          isOwn ? "items-end" : "items-start"
        } flex flex-col`}
      >
        <div
          className={`rounded-2xl px-4 py-2.5 shadow-sm ${
            isOwn
              ? "gradient-primary text-primary-foreground rounded-br-md"
              : "bg-card border border-border rounded-bl-md"
          }`}
        >
          {renderContent()}
        </div>

        <div
          className={`flex items-center gap-1.5 mt-1 px-1 ${
            isOwn ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(timestamp), "h:mm a")}
          </span>
          {isOwn && (
            <span className="text-muted-foreground">
              {isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-accent" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
