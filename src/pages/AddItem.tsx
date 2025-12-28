import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Camera,
  MapPin,
  Phone,
  Shirt,
  BookOpen,
  Smartphone,
  Gift,
  Sparkles,
  Heart,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type ItemCategory = Database["public"]["Enums"]["item_category"];
type ItemCondition = Database["public"]["Enums"]["item_condition"];

const categories = [
  { value: "clothing" as ItemCategory, icon: Shirt, label: "Clothing" },
  { value: "school_supplies" as ItemCategory, icon: BookOpen, label: "School Supplies" },
  { value: "electronics" as ItemCategory, icon: Smartphone, label: "Electronics" },
  { value: "other" as ItemCategory, icon: Gift, label: "Other Items" },
];

const conditions = [
  { value: "new" as ItemCondition, label: "New" },
  { value: "like_new" as ItemCondition, label: "Like New" },
  { value: "good" as ItemCondition, label: "Good" },
  { value: "fair" as ItemCondition, label: "Fair" },
];

const thankYouQuotes = [
  "Your kindness will make someone's day brighter! ✨",
  "A small act of giving can change a life forever! 💫",
  "You're proof that angels walk among us! 👼",
  "The world needs more people like you! 🌍💚",
];

export default function AddItem() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ItemCategory>("clothing");
  const [condition, setCondition] = useState<ItemCondition>("good");
  const [pickupAddress, setPickupAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        // Pre-fill contact from profile
        supabase
          .from("profiles")
          .select("mobile_number, address")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setContactNumber(data.mobile_number || "");
              setPickupAddress(data.address || "");
            }
          });
      }
    });
  }, [navigate]);

  const detectLocation = () => {
    setLocationLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);

          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            );
            const data = await response.json();
            if (data.display_name) {
              setPickupAddress(data.display_name);
            }
          } catch (error) {
            console.log("Could not reverse geocode");
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (userId: string): Promise<string | null> => {
    if (!imageFile) return null;

    setImageUploading(true);
    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("item-images")
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error("Image upload failed:", uploadError);
      setImageUploading(false);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("item-images")
      .getPublicUrl(filePath);

    setImageUploading(false);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!name.trim()) {
      toast.error("Please enter an item name");
      return;
    }

    setIsLoading(true);

    // Upload image first if present
    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploadImage(user.id);
      if (imageFile && !imageUrl) {
        toast.error("Failed to upload image");
        setIsLoading(false);
        return;
      }
    }

    const { error } = await supabase.from("items").insert({
      donor_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      category,
      condition,
      pickup_address: pickupAddress || null,
      pickup_latitude: latitude,
      pickup_longitude: longitude,
      contact_number: contactNumber || null,
      is_urgent: isUrgent,
      image_url: imageUrl,
    });

    if (error) {
      toast.error("Failed to add item. Please try again.");
      console.error(error);
    } else {
      setShowCelebration(true);
    }
    setIsLoading(false);
  };

  if (showCelebration) {
    const randomQuote = thankYouQuotes[Math.floor(Math.random() * thankYouQuotes.length)];

    return (
      <div className="min-h-screen gradient-splash flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-6 animate-celebration">
          <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mx-auto animate-bounce-gentle">
            <PartyPopper className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-white">Thank You!</h1>
          <p className="text-xl text-white/90 max-w-xs">{randomQuote}</p>
          <div className="flex flex-col space-y-3 pt-6">
            <Button
              onClick={() => navigate("/dashboard")}
              className="bg-white text-primary hover:bg-white/90"
            >
              <Heart className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowCelebration(false);
                setName("");
                setDescription("");
                setImagePreview(null);
                setImageFile(null);
              }}
              className="text-white hover:bg-white/10"
            >
              Add Another Item
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-primary p-4 pb-6 rounded-b-[2rem]">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/10 hover:bg-white/20 text-white rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-white font-heading font-bold text-xl">Donate an Item</h1>
        </div>
      </div>

      <div className="px-4 -mt-4">
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Share Your Kindness</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Item Photo</Label>
                <label className="block">
                  <div
                    className={`aspect-video rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary/50 hover:bg-muted/50 ${
                      imagePreview ? "p-0 border-0" : "p-6"
                    }`}
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                          <Camera className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">Tap to add a photo</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              </div>

              {/* Item Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Winter Jacket, School Bag"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category *</Label>
                <RadioGroup
                  value={category}
                  onValueChange={(v) => setCategory(v as ItemCategory)}
                  className="grid grid-cols-2 gap-2"
                >
                  {categories.map((cat) => (
                    <Label
                      key={cat.value}
                      htmlFor={cat.value}
                      className={`flex items-center space-x-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        category === cat.value
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <RadioGroupItem value={cat.value} id={cat.value} className="sr-only" />
                      <cat.icon
                        className={`w-5 h-5 ${
                          category === cat.value ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-sm font-medium">{cat.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* Condition */}
              <div className="space-y-2">
                <Label>Condition *</Label>
                <RadioGroup
                  value={condition}
                  onValueChange={(v) => setCondition(v as ItemCondition)}
                  className="flex flex-wrap gap-2"
                >
                  {conditions.map((cond) => (
                    <Label
                      key={cond.value}
                      htmlFor={`cond-${cond.value}`}
                      className={`px-4 py-2 rounded-full border-2 cursor-pointer transition-all ${
                        condition === cond.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border"
                      }`}
                    >
                      <RadioGroupItem
                        value={cond.value}
                        id={`cond-${cond.value}`}
                        className="sr-only"
                      />
                      {cond.label}
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the item (size, color, any details...)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Pickup Address */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="address">Pickup Location</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={detectLocation}
                    disabled={locationLoading}
                    className="text-xs text-primary"
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    {locationLoading ? "Detecting..." : "Use Current"}
                  </Button>
                </div>
                <Input
                  id="address"
                  placeholder="Where can receivers pick up the item?"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                />
              </div>

              {/* Contact */}
              <div className="space-y-2">
                <Label htmlFor="contact">Contact Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="contact"
                    type="tel"
                    placeholder="Your phone number"
                    className="pl-10"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Urgent Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                <div>
                  <p className="font-medium">Mark as Urgent</p>
                  <p className="text-xs text-muted-foreground">
                    Highlights this item for faster matching
                  </p>
                </div>
                <Switch checked={isUrgent} onCheckedChange={setIsUrgent} />
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary text-white py-6"
                disabled={isLoading || imageUploading}
              >
                {isLoading || imageUploading ? "Posting..." : "Share This Item 💝"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}