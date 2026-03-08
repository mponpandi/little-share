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
  X,
  Plus,
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

const MAX_IMAGES = 5;

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
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
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
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - imageFiles.length;
    if (files.length > remaining) {
      toast.error(`You can add up to ${MAX_IMAGES} images`);
    }
    const toAdd = files.slice(0, remaining);

    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    setImageFiles((prev) => [...prev, ...toAdd]);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (userId: string): Promise<string | null> => {
    if (imageFiles.length === 0) return null;

    setImageUploading(true);
    const urls: string[] = [];

    for (const file of imageFiles) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("item-images")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Image upload failed:", uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("item-images")
        .getPublicUrl(filePath);

      urls.push(urlData.publicUrl);
    }

    setImageUploading(false);
    return urls.length > 0 ? urls.join(",") : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!name.trim()) {
      toast.error("Please enter an item name");
      return;
    }

    setIsLoading(true);

    let imageUrl: string | null = null;
    if (imageFiles.length > 0) {
      imageUrl = await uploadImages(user.id);
      if (!imageUrl) {
        toast.error("Failed to upload images");
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
                setImagePreviews([]);
                setImageFiles([]);
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
              {/* Multiple Image Upload */}
              <div className="space-y-2">
                <Label>Item Photos (up to {MAX_IMAGES})</Label>
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                  {imageFiles.length < MAX_IMAGES && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary/50 hover:bg-muted/50">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                        {imagePreviews.length === 0 ? (
                          <Camera className="w-5 h-5 text-primary" />
                        ) : (
                          <Plus className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center px-1">
                        {imagePreviews.length === 0 ? "Add Photo" : "Add More"}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </div>
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
