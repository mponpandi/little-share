import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { ItemCard } from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Package, Sparkles, Users } from "lucide-react";
import { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { AIRequestAnalysis } from "@/components/AIRequestAnalysis";
import { toast } from "sonner";

type Item = Database["public"]["Tables"]["items"]["Row"];
type RequestCount = { item_id: string; count: number };

export default function MyPosts() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeItems, setActiveItems] = useState<Item[]>([]);
  const [completedItems, setCompletedItems] = useState<Item[]>([]);
  const [requestCounts, setRequestCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [aiAnalysisItem, setAiAnalysisItem] = useState<{
    itemId: string;
    itemName: string;
    requestCount: number;
  } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchItems(session.user.id);
      }
    });
  }, [navigate]);

  const fetchItems = async (userId: string) => {
    setIsLoading(true);

    const { data: items } = await supabase
      .from("items")
      .select("*")
      .eq("donor_id", userId)
      .order("created_at", { ascending: false });

    if (items) {
      setActiveItems(items.filter((item) => item.is_available));
      setCompletedItems(items.filter((item) => !item.is_available));

      // Fetch pending request counts for each active item
      const activeItemIds = items.filter((item) => item.is_available).map((item) => item.id);
      if (activeItemIds.length > 0) {
        const { data: requests } = await supabase
          .from("requests")
          .select("item_id")
          .in("item_id", activeItemIds)
          .eq("status", "pending");

        if (requests) {
          const counts: Record<string, number> = {};
          requests.forEach((req) => {
            counts[req.item_id] = (counts[req.item_id] || 0) + 1;
          });
          setRequestCounts(counts);
        }
      }
    }

    setIsLoading(false);
  };

  const handleAcceptRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("requests")
      .update({ status: "accepted" })
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to accept request");
    } else {
      toast.success("Request accepted!");
      setAiAnalysisItem(null);
      if (user) fetchItems(user.id);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-accent p-4 pb-6 rounded-b-[2rem]">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/10 hover:bg-white/20 text-white rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-white font-heading font-bold text-xl">My Donations</h1>
        </div>
      </div>

      <div className="px-4 -mt-4">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-card shadow-card">
            <TabsTrigger
              value="active"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
            >
              Active ({activeItems.length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
            >
              Donated ({completedItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {/* AI Analysis Panel */}
            {aiAnalysisItem && (
              <AIRequestAnalysis
                itemId={aiAnalysisItem.itemId}
                itemName={aiAnalysisItem.itemName}
                pendingRequestsCount={aiAnalysisItem.requestCount}
                onSelectRequest={handleAcceptRequest}
                onClose={() => setAiAnalysisItem(null)}
              />
            )}

            {activeItems.length === 0 ? (
              <EmptyState
                message="You haven't posted any items yet"
                actionLabel="Donate Something"
                onAction={() => navigate("/add-item")}
              />
            ) : (
              <div className="space-y-3">
                {activeItems.map((item) => {
                  const reqCount = requestCounts[item.id] || 0;
                  return (
                    <Card key={item.id} className="border-0 shadow-card overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex">
                          <div 
                            className="w-24 h-24 bg-muted flex-shrink-0 cursor-pointer"
                            onClick={() => navigate(`/item/${item.id}`)}
                          >
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                            )}
                          </div>
                          <div className="flex-1 p-3">
                            <div className="flex items-start justify-between">
                              <div onClick={() => navigate(`/item/${item.id}`)} className="cursor-pointer flex-1">
                                <h3 className="font-semibold line-clamp-1">{item.name}</h3>
                                <Badge variant="outline" className="text-xs mt-1 capitalize">
                                  {item.category.replace("_", " ")}
                                </Badge>
                              </div>
                              {item.is_urgent && (
                                <Badge className="bg-destructive/10 text-destructive text-xs">Urgent</Badge>
                              )}
                            </div>

                            {/* Request count and AI ranking button */}
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Users className="w-4 h-4" />
                                <span>{reqCount} request{reqCount !== 1 ? "s" : ""}</span>
                              </div>
                              
                              {reqCount > 1 && !aiAnalysisItem && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs border-primary/30 text-primary hover:bg-primary/10"
                                  onClick={() => setAiAnalysisItem({
                                    itemId: item.id,
                                    itemName: item.name,
                                    requestCount: reqCount,
                                  })}
                                >
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  AI Ranking
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedItems.length === 0 ? (
              <EmptyState
                message="No completed donations yet"
                actionLabel="View Active Items"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {completedItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    category={item.category}
                    condition={item.condition}
                    imageUrl={item.image_url || undefined}
                    donorName="You"
                    createdAt={item.created_at}
                    onClick={() => navigate(`/item/${item.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}

function EmptyState({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Package className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground mb-4">{message}</p>
      {onAction && (
        <Button onClick={onAction} className="gradient-primary text-white">
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}