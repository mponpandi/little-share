import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { ItemCard } from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Search,
  Shirt,
  BookOpen,
  Smartphone,
  Gift,
  Filter,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Item = Database["public"]["Tables"]["items"]["Row"] & {
  profiles?: { full_name: string } | null;
};

type CategoryKey = "clothing" | "school_supplies" | "electronics" | "other";

const categories: { key: CategoryKey | "all"; icon: React.ElementType; label: string }[] = [
  { key: "all", icon: Filter, label: "All" },
  { key: "clothing", icon: Shirt, label: "Clothing" },
  { key: "school_supplies", icon: BookOpen, label: "School" },
  { key: "electronics", icon: Smartphone, label: "Electronics" },
  { key: "other", icon: Gift, label: "Other" },
];

export default function Browse() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category") as CategoryKey | null;
  
  const [items, setItems] = useState<Item[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | "all">(categoryParam || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    // Sync URL with selected category
    if (selectedCategory === "all") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", selectedCategory);
    }
    setSearchParams(searchParams, { replace: true });
  }, [selectedCategory]);

  const fetchItems = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("items")
      .select(`*, profiles:donor_id(full_name)`)
      .eq("is_available", true)
      .order("created_at", { ascending: false });

    if (data) {
      setItems(data as Item[]);
    }
    setIsLoading(false);
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryLabel = () => {
    const cat = categories.find((c) => c.key === selectedCategory);
    return cat?.label || "All Items";
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-heading font-bold text-lg">
              {selectedCategory === "all" ? "Browse All" : getCategoryLabel()}
            </h1>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filters */}
          <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.key;
              return (
                <Button
                  key={cat.key}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={`flex-shrink-0 rounded-full ${
                    isActive ? "gradient-primary text-white border-0" : ""
                  }`}
                  onClick={() => setSelectedCategory(cat.key)}
                >
                  <Icon className="w-4 h-4 mr-1" />
                  {cat.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-4">
          {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"} found
        </p>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-muted rounded-2xl h-48 animate-pulse"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No items found</p>
            <Button
              variant="link"
              className="mt-2"
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                id={item.id}
                name={item.name}
                category={item.category}
                condition={item.condition}
                imageUrl={item.image_url || undefined}
                donorName={
                  (item.profiles as { full_name: string } | null)?.full_name ||
                  "Anonymous"
                }
                createdAt={item.created_at}
                isUrgent={item.is_urgent}
                onClick={() => navigate(`/item/${item.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
