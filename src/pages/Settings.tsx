import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { BottomNav } from "@/components/BottomNav";
import { NotificationSettings } from "@/components/NotificationSettings";
import {
  ArrowLeft,
  Bell,
  Moon,
  Globe,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

export default function Settings() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [vibration, setVibration] = useState(true);

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
          <h1 className="text-white font-heading font-bold text-xl">Settings</h1>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Notifications Section */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg flex items-center">
              <Bell className="w-5 h-5 mr-2 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationSettings />
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg flex items-center">
              <Moon className="w-5 h-5 mr-2 text-primary" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">
                  Switch to dark theme
                </p>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Vibration</p>
                <p className="text-sm text-muted-foreground">
                  Haptic feedback on actions
                </p>
              </div>
              <Switch checked={vibration} onCheckedChange={setVibration} />
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card className="border-0 shadow-card">
          <CardContent className="p-0">
            <button className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">Language</p>
                  <p className="text-sm text-muted-foreground">English</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">LittleShare v1.0.0</p>
          <p className="text-xs text-muted-foreground mt-1">
            Made with 💚 for communities
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}