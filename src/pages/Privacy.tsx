import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { BottomNav } from "@/components/BottomNav";
import {
  ArrowLeft,
  Shield,
  Eye,
  MapPin,
  Phone,
  Trash2,
} from "lucide-react";
import { useState } from "react";

export default function Privacy() {
  const navigate = useNavigate();
  const [showLocation, setShowLocation] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [shareAnalytics, setShareAnalytics] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
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
          <h1 className="text-white font-heading font-bold text-xl">
            Privacy & Security
          </h1>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Visibility */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg flex items-center">
              <Eye className="w-5 h-5 mr-2 text-primary" />
              Profile Visibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Show Location</p>
                  <p className="text-sm text-muted-foreground">
                    Display your city on profile
                  </p>
                </div>
              </div>
              <Switch checked={showLocation} onCheckedChange={setShowLocation} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Show Phone Number</p>
                  <p className="text-sm text-muted-foreground">
                    Visible to connected users only
                  </p>
                </div>
              </div>
              <Switch checked={showPhone} onCheckedChange={setShowPhone} />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg flex items-center">
              <Shield className="w-5 h-5 mr-2 text-primary" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Share Analytics</p>
                <p className="text-sm text-muted-foreground">
                  Help us improve the app
                </p>
              </div>
              <Switch
                checked={shareAnalytics}
                onCheckedChange={setShareAnalytics}
              />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-0 shadow-card border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg flex items-center text-destructive">
              <Trash2 className="w-5 h-5 mr-2" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Once you delete your account, there is no going back. Please be
              certain.
            </p>
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              Delete My Account
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}