import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, MoreVertical, Phone, Video } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
    <div className="flex items-center gap-3 px-2 py-3 border-b bg-card shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="shrink-0 rounded-full h-9 w-9"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <div className="relative">
        <Avatar className="w-10 h-10">
          <AvatarImage src={otherUserAvatar} alt={otherUserName} />
          <AvatarFallback className="bg-secondary text-secondary-foreground font-medium text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-foreground truncate text-[15px]">
          {otherUserName}
        </h2>
        <p className="text-xs text-muted-foreground truncate">
          {isOnline ? (
            <span className="text-green-600 font-medium">Online</span>
          ) : lastSeen ? (
            `Last seen ${lastSeen}`
          ) : (
            <span className="opacity-70">Re: {itemName}</span>
          )}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full h-9 w-9">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onShareLocation}>
            <MapPin className="w-4 h-4 mr-2 text-accent" />
            Share Location
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onStartLiveLocation}>
            <MapPin className={`w-4 h-4 mr-2 ${isLiveSharing ? "text-destructive" : "text-primary"}`} />
            {isLiveSharing ? "Stop Live Location" : "Share Live Location"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
