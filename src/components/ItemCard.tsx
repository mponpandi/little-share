import { MapPin, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ItemCardProps {
  id: string;
  name: string;
  category: string;
  condition: string;
  imageUrl?: string;
  donorName: string;
  distance?: string;
  createdAt: string;
  isUrgent?: boolean;
  onClick?: () => void;
}

const categoryColors: Record<string, string> = {
  clothing: "bg-purple/10 text-purple",
  school_supplies: "bg-teal/10 text-teal",
  electronics: "bg-gold/10 text-gold-dark",
  other: "bg-pink/10 text-pink",
};

const conditionLabels: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
};

export function ItemCard({
  name,
  category,
  condition,
  imageUrl,
  donorName,
  distance,
  createdAt,
  isUrgent,
  onClick,
}: ItemCardProps) {
  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  const categoryLabel = category.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Card
      className="overflow-hidden border-0 shadow-card cursor-pointer transition-all hover:shadow-lg active:scale-[0.98]"
      onClick={onClick}
    >
      <div className="relative">
        <div className="aspect-[4/3] bg-muted">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <span className="text-4xl">📦</span>
            </div>
          )}
        </div>
        {isUrgent && (
          <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">
            Urgent
          </Badge>
        )}
        <Badge className={`absolute top-2 right-2 ${categoryColors[category] || categoryColors.other}`}>
          {categoryLabel}
        </Badge>
      </div>
      <CardContent className="p-3 space-y-2">
        <h3 className="font-semibold text-foreground line-clamp-1">{name}</h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center">
            <User className="w-3 h-3 mr-1" />
            {donorName}
          </span>
          <span className="px-2 py-0.5 bg-muted rounded-full">
            {conditionLabels[condition] || condition}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {distance && (
            <span className="flex items-center text-primary font-medium">
              <MapPin className="w-3 h-3 mr-1" />
              {distance}
            </span>
          )}
          <span className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {formatDate(createdAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}