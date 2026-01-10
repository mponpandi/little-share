import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatHeaderProps {
  otherUserName: string;
  otherUserAvatar?: string;
  itemName: string;
  isOnline: boolean;
  lastSeen?: string;
  onBack: () => void;
  onShareLocation: () => void;
  onStartLiveLocation: () => void;
  isLiveSharing: boolean;
}

export function ChatHeader({
  otherUserName,
  otherUserAvatar,
  itemName,
  isOnline,
  lastSeen,
  onBack,
  onShareLocation,
  onStartLiveLocation,
  isLiveSharing,
}: ChatHeaderProps) {
  const initials = otherUserName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3 p-4 border-b bg-card/50 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="shrink-0 -ml-2"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <div className="relative">
        <Avatar className="w-10 h-10">
          <AvatarImage src={otherUserAvatar} alt={otherUserName} />
          <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-foreground truncate">
          {otherUserName}
        </h2>
        <p className="text-xs text-muted-foreground truncate">
          {isOnline
            ? "Online"
            : lastSeen
            ? `Last seen ${lastSeen}`
            : `About: ${itemName}`}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onShareLocation}>
            <MapPin className="w-4 h-4 mr-2" />
            Share Location
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onStartLiveLocation}>
            <MapPin className="w-4 h-4 mr-2 text-primary" />
            {isLiveSharing ? "Stop Live Location" : "Share Live Location"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
