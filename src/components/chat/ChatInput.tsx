import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image, Loader2, MapPin } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onSendImage: (file: File) => void;
  onShareLocation: () => void;
  isSending: boolean;
  disabled?: boolean;
}

export function ChatInput({
  onSendMessage,
  onSendImage,
  onShareLocation,
  isSending,
  disabled,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isSending) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendImage(file);
      setAttachOpen(false);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Popover open={attachOpen} onOpenChange={setAttachOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              disabled={disabled}
            >
              <span className="text-xl">+</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-40 p-2">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted transition-colors text-sm"
            >
              <Image className="w-4 h-4 text-accent" />
              Send Photo
            </button>
            <button
              type="button"
              onClick={() => {
                onShareLocation();
                setAttachOpen(false);
              }}
              className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted transition-colors text-sm"
            >
              <MapPin className="w-4 h-4 text-primary" />
              Share Location
            </button>
          </PopoverContent>
        </Popover>

        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
          disabled={isSending || disabled}
        />

        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || isSending || disabled}
          className="rounded-full gradient-primary shadow-soft shrink-0"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
