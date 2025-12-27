import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { ItemCard } from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Package } from "lucide-react";
import { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Item = Database["public"]["Tables"]["items"]["Row"];

export default function MyPosts() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeItems, setActiveItems] = useState<Item[]>([]);
  const [completedItems, setCompletedItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    }

    setIsLoading(false);
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

          <TabsContent value="active">
            {activeItems.length === 0 ? (
              <EmptyState
                message="You haven't posted any items yet"
                actionLabel="Donate Something"
                onAction={() => navigate("/add-item")}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {activeItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    category={item.category}
                    condition={item.condition}
                    imageUrl={item.image_url || undefined}
                    donorName="You"
                    createdAt={item.created_at}
                    isUrgent={item.is_urgent}
                    onClick={() => navigate(`/item/${item.id}`)}
                  />
                ))}
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