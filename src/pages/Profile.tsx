import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User as UserIcon,
  Phone,
  MapPin,
  Edit2,
  LogOut,
  Gift,
  Heart,
  ChevronRight,
  Settings,
  HelpCircle,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const userTypeBadges = {
  donor: { label: "Donor", className: "bg-teal/10 text-teal" },
  receiver: { label: "Receiver", className: "bg-purple/10 text-purple" },
  both: { label: "Donor & Receiver", className: "bg-primary/10 text-primary" },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [donatedCount, setDonatedCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
        fetchStats(session.user.id);
      }
    });
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  const fetchStats = async (userId: string) => {
    // Count donated items
    const { count: donated } = await supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .eq("donor_id", userId);
    setDonatedCount(donated || 0);

    // Count received items (completed requests)
    const { count: received } = await supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("status", "completed");
    setReceivedCount(received || 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const badgeInfo = profile?.user_type ? userTypeBadges[profile.user_type] : userTypeBadges.both;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-purple p-6 pb-20 rounded-b-[2rem]">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-heading font-bold text-xl">My Profile</h1>
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/10 hover:bg-white/20 text-white rounded-full"
            onClick={() => navigate("/settings")}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="px-4 -mt-16 space-y-4">
        {/* Profile Card */}
        <Card className="border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <UserIcon className="w-10 h-10 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-heading font-bold text-xl truncate">
                  {profile?.full_name || "User"}
                </h2>
                <Badge className={`mt-1 ${badgeInfo.className}`}>{badgeInfo.label}</Badge>
                <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{profile?.mobile_number || "No phone"}</span>
                  </div>
                  {profile?.city && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span className="truncate">{profile.city}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => navigate("/edit-profile")}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center mx-auto mb-2">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold font-heading">{donatedCount}</p>
              <p className="text-sm text-muted-foreground">Items Donated</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 rounded-xl gradient-purple flex items-center justify-center mx-auto mb-2">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold font-heading">{receivedCount}</p>
              <p className="text-sm text-muted-foreground">Items Received</p>
            </CardContent>
          </Card>
        </div>

        {/* Menu Items */}
        <Card className="border-0 shadow-card">
          <CardContent className="p-0 divide-y divide-border">
            <MenuItem
              icon={Gift}
              label="My Donations"
              onClick={() => navigate("/my-posts")}
            />
            <MenuItem
              icon={Heart}
              label="My Requests"
              onClick={() => navigate("/requests")}
            />
            <MenuItem
              icon={Shield}
              label="Privacy & Security"
              onClick={() => navigate("/privacy")}
            />
            <MenuItem
              icon={HelpCircle}
              label="Help & Support"
              onClick={() => navigate("/help")}
            />
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full text-destructive border-destructive/20 hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log Out
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}