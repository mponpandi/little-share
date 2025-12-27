import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { CategoryCard } from "@/components/CategoryCard";
import { ItemCard } from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Search,
  Shirt,
  BookOpen,
  Smartphone,
  Gift,
  MapPin,
  Flame,
  Clock,
  ChevronRight,
} from "lucide-react";
import { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Item = Database["public"]["Tables"]["items"]["Row"] & {
  profiles?: { full_name: string } | null;
};

const categories = [
  { key: "clothing", icon: Shirt, label: "Clothing", gradient: "gradient-purple" },
  { key: "school_supplies", icon: BookOpen, label: "School", gradient: "gradient-accent" },
  { key: "electronics", icon: Smartphone, label: "Electronics", gradient: "gradient-gold" },
  { key: "other", icon: Gift, label: "Other", gradient: "gradient-primary" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [urgentItems, setUrgentItems] = useState<Item[]>([]);
  const [recentItems, setRecentItems] = useState<Item[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(profileData);

    // Fetch all available items with donor info
    const { data: itemsData } = await supabase
      .from("items")
      .select(`*, profiles:donor_id(full_name)`)
      .eq("is_available", true)
      .order("created_at", { ascending: false });
    
    if (itemsData) {
      setItems(itemsData as Item[]);
      
      // Filter urgent items
      setUrgentItems((itemsData as Item[]).filter((item) => item.is_urgent).slice(0, 5));
      
      // Get recent items
      setRecentItems((itemsData as Item[]).slice(0, 6));

      // Count by category
      const counts: Record<string, number> = {};
      itemsData.forEach((item) => {
        counts[item.category] = (counts[item.category] || 0) + 1;
      });
      setCategoryCounts(counts);
    }

    // Count unread notifications
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setUnreadNotifications(count || 0);

    setIsLoading(false);
  };

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("items-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredItems = searchQuery
    ? items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const firstName = profile?.full_name?.split(" ")[0] || "Friend";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-primary p-4 pb-8 rounded-b-[2rem]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm">Welcome back,</p>
            <h1 className="text-white font-heading font-bold text-xl">{firstName} 👋</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="relative bg-white/10 hover:bg-white/20 text-white rounded-full"
            onClick={() => navigate("/notifications")}
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold text-xs font-bold rounded-full flex items-center justify-center text-foreground">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search donations..."
            className="pl-10 bg-white/95 border-0 shadow-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-6">
        {/* Search Results */}
        {filteredItems && (
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <h2 className="font-heading font-semibold mb-3">Search Results</h2>
            {filteredItems.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No items found</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredItems.slice(0, 4).map((item) => (
                  <ItemCard
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    category={item.category}
                    condition={item.condition}
                    imageUrl={item.image_url || undefined}
                    donorName={(item.profiles as { full_name: string } | null)?.full_name || "Anonymous"}
                    createdAt={item.created_at}
                    isUrgent={item.is_urgent}
                    onClick={() => navigate(`/item/${item.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories */}
        {!filteredItems && (
          <>
            <div className="bg-card rounded-2xl p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-semibold">Categories</h2>
                <Button variant="ghost" size="sm" className="text-primary text-xs">
                  See All <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {categories.map((cat) => (
                  <CategoryCard
                    key={cat.key}
                    icon={cat.icon}
                    label={cat.label}
                    count={categoryCounts[cat.key] || 0}
                    gradient={cat.gradient}
                    onClick={() => navigate(`/browse?category=${cat.key}`)}
                  />
                ))}
              </div>
            </div>

            {/* Urgent Needs */}
            {urgentItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Flame className="w-5 h-5 text-destructive" />
                    <h2 className="font-heading font-semibold">Urgent Needs</h2>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary text-xs">
                    View All <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
                <div className="flex overflow-x-auto space-x-3 pb-2 -mx-1 px-1 scrollbar-hide">
                  {urgentItems.map((item) => (
                    <div key={item.id} className="flex-shrink-0 w-40">
                      <ItemCard
                        id={item.id}
                        name={item.name}
                        category={item.category}
                        condition={item.condition}
                        imageUrl={item.image_url || undefined}
                        donorName={(item.profiles as { full_name: string } | null)?.full_name || "Anonymous"}
                        createdAt={item.created_at}
                        isUrgent={item.is_urgent}
                        onClick={() => navigate(`/item/${item.id}`)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby Donations */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-teal" />
                  <h2 className="font-heading font-semibold">Nearby Donations</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs"
                  onClick={() => navigate("/map")}
                >
                  Map View <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {recentItems.slice(0, 4).map((item) => (
                  <ItemCard
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    category={item.category}
                    condition={item.condition}
                    imageUrl={item.image_url || undefined}
                    donorName={(item.profiles as { full_name: string } | null)?.full_name || "Anonymous"}
                    createdAt={item.created_at}
                    isUrgent={item.is_urgent}
                    onClick={() => navigate(`/item/${item.id}`)}
                  />
                ))}
              </div>
            </div>

            {/* Recently Added */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-purple" />
                  <h2 className="font-heading font-semibold">Recently Added</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs"
                  onClick={() => navigate("/browse")}
                >
                  Browse All <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {recentItems.slice(0, 4).map((item) => (
                  <ItemCard
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    category={item.category}
                    condition={item.condition}
                    imageUrl={item.image_url || undefined}
                    donorName={(item.profiles as { full_name: string } | null)?.full_name || "Anonymous"}
                    createdAt={item.created_at}
                    onClick={() => navigate(`/item/${item.id}`)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}