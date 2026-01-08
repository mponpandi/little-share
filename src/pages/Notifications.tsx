import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Bell, Gift, Heart, Check, CheckCheck, X } from "lucide-react";
import { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

const iconMap: Record<string, React.ElementType> = {
  new_item: Gift,
  request_received: Heart,
  request_accepted: Check,
  request_declined: X,
  default: Bell,
};

export default function Notifications() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchNotifications(session.user.id);
      }
    });
  }, [navigate]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-page-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async (userId: string) => {
    setIsLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setNotifications(data);
    }
    setIsLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read first
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type and related data
    if (notification.related_item_id) {
      navigate(`/item/${notification.related_item_id}`);
    } else if (notification.related_request_id) {
      navigate("/requests");
    } else {
      // Default: just mark as read, no navigation
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="gradient-primary p-4 pb-6 rounded-b-[2rem]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="bg-white/10 hover:bg-white/20 text-white rounded-full"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-white font-heading font-bold text-xl">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={markAllAsRead}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-3">
        {isLoading ? (
          <Card className="border-0 shadow-card">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto" />
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card className="border-0 shadow-card">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => {
            const Icon = iconMap[notification.type] || iconMap.default;
            const hasAction = notification.related_item_id || notification.related_request_id;
            return (
              <Card
                key={notification.id}
                className={`border-0 shadow-card cursor-pointer transition-all hover:shadow-lg ${
                  !notification.is_read ? "bg-primary/5" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4 flex items-start space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      !notification.is_read ? "gradient-primary" : "bg-muted"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        !notification.is_read ? "text-white" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3
                        className={`font-medium line-clamp-1 ${
                          !notification.is_read ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {notification.title}
                      </h3>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    {hasAction && (
                      <p className="text-xs text-primary mt-1">Tap to view →</p>
                    )}
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}