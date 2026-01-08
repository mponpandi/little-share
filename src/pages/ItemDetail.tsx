import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Clock, User, Heart, MessageSquare, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { notifyNewRequest } from "@/lib/notifications";

type Item = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  condition: string;
  image_url: string | null;
  pickup_address: string | null;
  contact_number: string | null;
  is_urgent: boolean;
  is_available: boolean;
  created_at: string;
  donor_id: string;
  profiles: {
    full_name: string;
    mobile_number: string;
    avatar_url: string | null;
    city: string | null;
  } | null;
};

type RequestStatus = "none" | "pending" | "accepted" | "declined";

const categoryColors: Record<string, string> = {
  clothing: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  school_supplies: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  electronics: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const conditionLabels: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
};

const ItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("none");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }

      if (!id) return;

      // Fetch item with donor profile
      const { data: itemData, error: itemError } = await supabase
        .from("items")
        .select(`
          *,
          profiles:donor_id (
            full_name,
            mobile_number,
            avatar_url,
            city
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (itemError) {
        console.error("Error fetching item:", itemError);
        toast({ title: "Error", description: "Could not load item", variant: "destructive" });
        return;
      }

      if (itemData) {
        setItem(itemData as Item);
        setIsOwner(session?.user?.id === itemData.donor_id);

        // Check if user has already requested this item
        if (session?.user) {
          const { data: requestData } = await supabase
            .from("requests")
            .select("status")
            .eq("item_id", id)
            .eq("receiver_id", session.user.id)
            .maybeSingle();

          if (requestData) {
            setRequestStatus(requestData.status as RequestStatus);
          }
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [id, toast]);

  const handleRequest = async () => {
    if (!userId || !item) {
      toast({ title: "Please login", description: "You need to be logged in to request items", variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (isOwner) {
      toast({ title: "Error", description: "You cannot request your own item", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const { data: requestData, error } = await supabase.from("requests").insert({
      item_id: item.id,
      receiver_id: userId,
      message: message || null,
    }).select().single();

    if (error) {
      console.error("Error creating request:", error);
      toast({ title: "Error", description: "Could not send request", variant: "destructive" });
    } else {
      setRequestStatus("pending");
      toast({ title: "Request sent!", description: "The donor will be notified" });
      
      // Get current user's profile name for notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();
      
      // Send notification to the donor
      if (requestData && profile) {
        await notifyNewRequest(
          item.donor_id,
          profile.full_name,
          item.name,
          item.id,
          requestData.id
        );
      }
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground mb-4">Item not found</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header Image */}
      <div className="relative h-72 bg-gradient-to-br from-primary/20 to-secondary/20">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Heart className="w-20 h-20 text-primary/30" />
          </div>
        )}
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 rounded-full bg-background/80 backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Badges */}
        <div className="absolute bottom-4 left-4 flex gap-2">
          {item.is_urgent && (
            <Badge className="bg-destructive text-destructive-foreground">Urgent</Badge>
          )}
          <Badge className={categoryColors[item.category] || categoryColors.other}>
            {item.category.replace("_", " ")}
          </Badge>
          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
            {conditionLabels[item.condition] || item.condition}
          </Badge>
        </div>

        {!item.is_available && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Badge className="bg-muted text-muted-foreground text-lg px-4 py-2">
              No Longer Available
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 -mt-6 relative z-10">
        <Card className="p-5 bg-card border-border/50">
          <h1 className="text-2xl font-bold text-foreground mb-2">{item.name}</h1>
          
          {item.description && (
            <p className="text-muted-foreground mb-4">{item.description}</p>
          )}

          {/* Meta Info */}
          <div className="space-y-2 mb-4">
            {item.pickup_address && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{item.pickup_address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 text-primary" />
              <span>Posted {formatDistanceToNow(new Date(item.created_at))} ago</span>
            </div>
          </div>
        </Card>

        {/* Donor Card */}
        <Card className="p-4 mt-4 bg-card border-border/50">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Donated by</h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              {item.profiles?.avatar_url ? (
                <img
                  src={item.profiles.avatar_url}
                  alt={item.profiles.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-primary-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{item.profiles?.full_name || "Anonymous"}</p>
              {item.profiles?.city && (
                <p className="text-sm text-muted-foreground">{item.profiles.city}</p>
              )}
            </div>
          </div>

          {/* Show contact info only if request is accepted */}
          {requestStatus === "accepted" && (
            <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">Request Accepted!</span>
              </div>
              <a
                href={`tel:${item.contact_number || item.profiles?.mobile_number}`}
                className="flex items-center gap-2 text-foreground font-medium"
              >
                <Phone className="w-4 h-4 text-primary" />
                {item.contact_number || item.profiles?.mobile_number}
              </a>
            </div>
          )}
        </Card>

        {/* Request Section */}
        {!isOwner && item.is_available && (
          <Card className="p-4 mt-4 bg-card border-border/50">
            {requestStatus === "none" ? (
              <>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Send a message to the donor
                </h3>
                <Textarea
                  placeholder="Hi! I'm interested in this item..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mb-3 bg-background border-border"
                  rows={3}
                />
                <Button
                  onClick={handleRequest}
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  {submitting ? "Sending..." : "Request This Item"}
                </Button>
              </>
            ) : requestStatus === "pending" ? (
              <div className="text-center py-4">
                <Badge className="bg-warning/20 text-warning border-warning/30 mb-2">
                  Request Pending
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Waiting for the donor to respond
                </p>
              </div>
            ) : requestStatus === "declined" ? (
              <div className="text-center py-4">
                <Badge className="bg-destructive/20 text-destructive border-destructive/30 mb-2">
                  Request Declined
                </Badge>
                <p className="text-sm text-muted-foreground">
                  The donor has declined your request
                </p>
              </div>
            ) : null}
          </Card>
        )}

        {isOwner && (
          <Card className="p-4 mt-4 bg-primary/10 border-primary/30">
            <p className="text-center text-sm text-primary">This is your donation</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ItemDetail;
