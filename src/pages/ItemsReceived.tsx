import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Package, User, Calendar, MapPin } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface ReceivedItem {
  request_id: string;
  item_id: string;
  item_name: string;
  item_image: string | null;
  item_category: string;
  item_condition: string;
  completed_at: string;
  donor_name: string;
  donor_avatar: string | null;
  donor_city: string | null;
}

export default function ItemsReceived() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [items, setItems] = useState<ReceivedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchReceivedItems(session.user.id);
      }
    });
  }, [navigate]);

  const fetchReceivedItems = async (userId: string) => {
    setIsLoading(true);

    const { data: requests } = await supabase
      .from("requests")
      .select(`
        id,
        item_id,
        updated_at,
        items:item_id(id, name, image_url, category, condition, donor_id)
      `)
      .eq("receiver_id", userId)
      .in("status", ["completed", "accepted"])
      .order("updated_at", { ascending: false });

    if (requests && requests.length > 0) {
      const donorIds = requests
        .map((r: any) => r.items?.donor_id)
        .filter((id: string | undefined): id is string => !!id);

      const uniqueDonorIds = [...new Set(donorIds)];
      let donorProfiles: Record<string, { full_name: string; avatar_url: string | null; city: string | null }> = {};

      if (uniqueDonorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, city")
          .in("id", uniqueDonorIds);

        if (profiles) {
          donorProfiles = profiles.reduce((acc, p) => {
            acc[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url, city: p.city };
            return acc;
          }, {} as typeof donorProfiles);
        }
      }

      const receivedItems: ReceivedItem[] = requests.map((r: any) => {
        const donor = r.items?.donor_id ? donorProfiles[r.items.donor_id] : null;
        return {
          request_id: r.id,
          item_id: r.item_id,
          item_name: r.items?.name || "Unknown",
          item_image: r.items?.image_url || null,
          item_category: r.items?.category || "other",
          item_condition: r.items?.condition || "good",
          completed_at: r.updated_at,
          donor_name: donor?.full_name || "Anonymous",
          donor_avatar: donor?.avatar_url || null,
          donor_city: donor?.city || null,
        };
      });

      setItems(receivedItems);
    }

    setIsLoading(false);
  };

  const conditionLabels: Record<string, string> = {
    new: "New",
    like_new: "Like New",
    good: "Good",
    fair: "Fair",
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-purple p-4 pb-6 rounded-b-[2rem]">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/10 hover:bg-white/20 text-white rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-white font-heading font-bold text-xl">Items Received</h1>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No items received yet</p>
          </div>
        ) : (
          items.map((item) => (
            <Card
              key={item.request_id}
              className="border-0 shadow-card overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/item/${item.item_id}`)}
            >
              <CardContent className="p-0">
                <div className="flex">
                  <div className="w-24 h-24 bg-muted flex-shrink-0">
                    {item.item_image ? (
                      <img src={item.item_image} alt={item.item_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                    )}
                  </div>
                  <div className="flex-1 p-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold line-clamp-1">{item.item_name}</h3>
                      <Badge variant="outline" className="text-xs capitalize ml-2 flex-shrink-0">
                        {conditionLabels[item.item_condition] || item.item_condition}
                      </Badge>
                    </div>

                    {/* Donor info */}
                    <div className="flex items-center gap-2 mt-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={item.donor_avatar || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {item.donor_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Donated by {item.donor_name}</p>
                        {item.donor_city && (
                          <p className="text-xs text-muted-foreground flex items-center">
                            <MapPin className="w-3 h-3 mr-0.5" />
                            {item.donor_city}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center text-xs text-muted-foreground mt-1.5">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(item.completed_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
