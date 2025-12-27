import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Check, X, MessageSquare, Clock, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { User as SupabaseUser } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Request = Database["public"]["Tables"]["requests"]["Row"] & {
  items?: {
    id: string;
    name: string;
    image_url: string | null;
    category: string;
  } | null;
  profiles?: {
    full_name: string;
    mobile_number: string;
  } | null;
};

const statusColors: Record<string, string> = {
  pending: "bg-gold/10 text-gold-dark",
  accepted: "bg-teal/10 text-teal",
  declined: "bg-destructive/10 text-destructive",
  completed: "bg-purple/10 text-purple",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  completed: "Completed",
};

export default function Requests() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<Request[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchRequests(session.user.id);
      }
    });
  }, [navigate]);

  const fetchRequests = async (userId: string) => {
    setIsLoading(true);

    // Outgoing requests (as receiver)
    const { data: outgoing } = await supabase
      .from("requests")
      .select(`
        *,
        items:item_id(id, name, image_url, category)
      `)
      .eq("receiver_id", userId)
      .order("created_at", { ascending: false });

    if (outgoing) {
      setOutgoingRequests(outgoing as Request[]);
    }

    // Incoming requests (as donor) - need to join through items
    const { data: userItems } = await supabase
      .from("items")
      .select("id")
      .eq("donor_id", userId);

    if (userItems && userItems.length > 0) {
      const itemIds = userItems.map((item) => item.id);
      const { data: incoming } = await supabase
        .from("requests")
        .select(`
          *,
          items:item_id(id, name, image_url, category),
          profiles:receiver_id(full_name, mobile_number)
        `)
        .in("item_id", itemIds)
        .order("created_at", { ascending: false });

      if (incoming) {
        setIncomingRequests(incoming as Request[]);
      }
    }

    setIsLoading(false);
  };

  const handleAccept = async (requestId: string, itemId: string) => {
    const { error } = await supabase
      .from("requests")
      .update({ status: "accepted" })
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to accept request");
    } else {
      toast.success("Request accepted! Contact details shared.");
      if (user) fetchRequests(user.id);
    }
  };

  const handleDecline = async (requestId: string) => {
    const { error } = await supabase
      .from("requests")
      .update({ status: "declined" })
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to decline request");
    } else {
      toast.success("Request declined");
      if (user) fetchRequests(user.id);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-gold p-4 pb-6 rounded-b-[2rem]">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/10 hover:bg-white/20 text-foreground rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-foreground font-heading font-bold text-xl">Requests</h1>
        </div>
      </div>

      <div className="px-4 -mt-4">
        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-card shadow-card">
            <TabsTrigger
              value="incoming"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
            >
              Incoming ({incomingRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="outgoing"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
            >
              My Requests ({outgoingRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-3">
            {incomingRequests.length === 0 ? (
              <EmptyState message="No incoming requests yet" />
            ) : (
              incomingRequests.map((request) => (
                <IncomingRequestCard
                  key={request.id}
                  request={request}
                  onAccept={() => handleAccept(request.id, request.item_id)}
                  onDecline={() => handleDecline(request.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-3">
            {outgoingRequests.length === 0 ? (
              <EmptyState message="You haven't requested any items yet" />
            ) : (
              outgoingRequests.map((request) => (
                <OutgoingRequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}

function IncomingRequestCard({
  request,
  onAccept,
  onDecline,
}: {
  request: Request;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const item = request.items;
  const requester = request.profiles;

  return (
    <Card className="border-0 shadow-card overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          <div className="w-24 h-24 bg-muted flex-shrink-0">
            {item?.image_url ? (
              <img src={item.image_url} alt={item?.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
            )}
          </div>
          <div className="flex-1 p-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold line-clamp-1">{item?.name}</h3>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <User className="w-3 h-3 mr-1" />
                  <span>{requester?.full_name}</span>
                </div>
              </div>
              <Badge className={statusColors[request.status]}>{statusLabels[request.status]}</Badge>
            </div>

            {request.message && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{request.message}</p>
            )}

            {request.status === "pending" && (
              <div className="flex space-x-2 mt-3">
                <Button size="sm" onClick={onAccept} className="flex-1 gradient-accent text-white">
                  <Check className="w-4 h-4 mr-1" />
                  Accept
                </Button>
                <Button size="sm" variant="outline" onClick={onDecline} className="flex-1">
                  <X className="w-4 h-4 mr-1" />
                  Decline
                </Button>
              </div>
            )}

            {request.status === "accepted" && requester?.mobile_number && (
              <div className="flex items-center mt-3 p-2 bg-teal/10 rounded-lg">
                <Phone className="w-4 h-4 text-teal mr-2" />
                <a href={`tel:${requester.mobile_number}`} className="text-sm text-teal font-medium">
                  {requester.mobile_number}
                </a>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OutgoingRequestCard({ request }: { request: Request }) {
  const item = request.items;

  return (
    <Card className="border-0 shadow-card overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          <div className="w-24 h-24 bg-muted flex-shrink-0">
            {item?.image_url ? (
              <img src={item.image_url} alt={item?.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
            )}
          </div>
          <div className="flex-1 p-3">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold line-clamp-1">{item?.name}</h3>
              <Badge className={statusColors[request.status]}>{statusLabels[request.status]}</Badge>
            </div>

            {request.message && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{request.message}</p>
            )}

            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <Clock className="w-3 h-3 mr-1" />
              <span>
                {new Date(request.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}