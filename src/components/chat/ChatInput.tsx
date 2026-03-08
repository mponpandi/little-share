import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Image, Loader2, MapPin, Plus, Smile, Mic } from "lucide-react";
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

const quickEmojis = ["👍", "❤️", "😊", "🙏", "👋", "🎉", "😂", "🤝"];

export function ChatInput({
  onSendMessage,
  onSendImage,
  onShareLocation,
  isSending,
  disabled,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isSending) {
      onSendMessage(message.trim());
      setMessage("");
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
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

  const addEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 border-t bg-card/80 backdrop-blur-sm"
    >
      {/* Quick emoji bar */}
      {showEmojis && (
        <div className="flex items-center gap-1 mb-2 px-1 overflow-x-auto scrollbar-hide">
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-lg shrink-0"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <Popover open={attachOpen} onOpenChange={setAttachOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 h-10 w-10 rounded-full"
              disabled={disabled}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-44 p-1.5" side="top">
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
              className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-muted transition-colors text-sm"
            >
              <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center">
                <Image className="w-4 h-4 text-accent" />
              </div>
              Photo
            </button>
            <button
              type="button"
              onClick={() => {
                onShareLocation();
                setAttachOpen(false);
              }}
              className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-muted transition-colors text-sm"
            >
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              Location
            </button>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10 rounded-full"
          onClick={() => setShowEmojis(!showEmojis)}
          disabled={disabled}
        >
          <Smile className="w-5 h-5 text-muted-foreground" />
        </Button>

        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full rounded-2xl bg-muted/50 border-0 px-4 py-2.5 text-sm resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-primary min-h-[40px] max-h-[120px] leading-5"
            disabled={isSending || disabled}
            rows={1}
          />
        </div>

        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || isSending || disabled}
          className="rounded-full gradient-primary shadow-soft shrink-0 h-10 w-10"
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
