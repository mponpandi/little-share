import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Camera, MapPin, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type UserType = Database["public"]["Enums"]["user_type"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const userTypes = [
  { value: "donor" as UserType, label: "Donor", description: "I want to donate items" },
  { value: "receiver" as UserType, label: "Receiver", description: "I need items" },
  { value: "both" as UserType, label: "Both", description: "I want to do both" },
];

export default function EditProfile() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [userType, setUserType] = useState<UserType>("both");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setMobileNumber(profile.mobile_number || "");
        setAddress(profile.address || "");
        setCity(profile.city || "");
        setUserType(profile.user_type || "both");
        setAvatarUrl(profile.avatar_url);
      }
      setIsLoading(false);
    };

    loadProfile();
  }, [navigate]);

  const detectLocation = () => {
    setLocationLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            );
            const data = await response.json();
            if (data.address) {
              setCity(data.address.city || data.address.town || data.address.village || "");
              setAddress(data.display_name || "");
            }
          } catch (error) {
            console.error("Could not reverse geocode");
          }
          setLocationLoading(false);
          toast.success("Location detected!");
        },
        () => {
          setLocationLoading(false);
          toast.error("Could not detect location");
        }
      );
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setIsUploadingAvatar(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `${userId}/avatar.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload avatar");
      setIsUploadingAvatar(false);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const newAvatarUrl = urlData.publicUrl;

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: newAvatarUrl })
      .eq("id", userId);

    if (updateError) {
      toast.error("Failed to update profile");
    } else {
      setAvatarUrl(newAvatarUrl);
      toast.success("Avatar updated!");
    }

    setIsUploadingAvatar(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!fullName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!mobileNumber.trim()) {
      toast.error("Please enter your mobile number");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        mobile_number: mobileNumber.trim(),
        address: address.trim() || null,
        city: city.trim() || null,
        user_type: userType,
      })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } else {
      toast.success("Profile updated successfully!");
      navigate("/profile");
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
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
          <h1 className="text-white font-heading font-bold text-xl">Edit Profile</h1>
        </div>
      </div>

      <div className="px-4 -mt-4">
        <Card className="border-0 shadow-card">
          <CardHeader className="text-center pb-2">
            {/* Avatar Upload */}
            <label className="mx-auto cursor-pointer">
              <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center relative overflow-hidden group">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={isUploadingAvatar}
              />
            </label>
            <CardTitle className="font-heading text-lg mt-3">
              Tap to change photo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number *</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="Your phone number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  required
                />
              </div>

              {/* City */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="city">City</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={detectLocation}
                    disabled={locationLoading}
                    className="text-xs text-primary"
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    {locationLoading ? "Detecting..." : "Detect Location"}
                  </Button>
                </div>
                <Input
                  id="city"
                  placeholder="Your city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Your full address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              {/* User Type */}
              <div className="space-y-2">
                <Label>I want to</Label>
                <RadioGroup
                  value={userType}
                  onValueChange={(v) => setUserType(v as UserType)}
                  className="space-y-2"
                >
                  {userTypes.map((type) => (
                    <Label
                      key={type.value}
                      htmlFor={`type-${type.value}`}
                      className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        userType === type.value
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <RadioGroupItem
                        value={type.value}
                        id={`type-${type.value}`}
                        className="sr-only"
                      />
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary text-white py-6"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}