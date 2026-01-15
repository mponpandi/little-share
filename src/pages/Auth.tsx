import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Gift, Heart, User, MapPin, Phone, Lock, Mail, Sparkles, Users, HandHeart, Map, ArrowLeft, CheckCircle, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import LocationPicker from "@/components/LocationPicker";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  mobile: z.string().min(10, "Mobile number must be at least 10 digits"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  address: z.string().optional(),
  city: z.string().optional(),
  userType: z.enum(["donor", "receiver", "both"]),
});

const dailyQuotes = [
  "Every act of giving plants a seed of hope.",
  "The smallest donation can make the biggest difference.",
  "Generosity is the flower of justice.",
  "We rise by lifting others.",
];

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [dailyQuote] = useState(dailyQuotes[Math.floor(Math.random() * dailyQuotes.length)]);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  // Email verification state
  const [showVerificationSent, setShowVerificationSent] = useState(false);

  // Register state
  const [fullName, setFullName] = useState("");
  const [registerMobile, setRegisterMobile] = useState("");
  const [email, setEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [userType, setUserType] = useState<"donor" | "receiver" | "both">("both");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const handleLocationFromPicker = (lat: number, lng: number, newAddress: string, newCity: string) => {
    setLatitude(lat);
    setLongitude(lng);
    setAddress(newAddress);
    setCity(newCity);
    toast.success("Location updated!");
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const detectLocation = () => {
    setLocationLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          setLatitude(lat);
          setLongitude(lon);
          
          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&zoom=18`
            );
            const data = await response.json();
            if (data.address) {
              // Build a more readable address from components
              const addressParts = [];
              if (data.address.house_number) addressParts.push(data.address.house_number);
              if (data.address.road) addressParts.push(data.address.road);
              if (data.address.neighbourhood) addressParts.push(data.address.neighbourhood);
              if (data.address.suburb) addressParts.push(data.address.suburb);
              
              const formattedAddress = addressParts.length > 0 
                ? addressParts.join(", ")
                : data.display_name?.split(",").slice(0, 3).join(", ") || "";
              
              setAddress(formattedAddress);
              setCity(
                data.address.city || 
                data.address.town || 
                data.address.village || 
                data.address.municipality ||
                data.address.county ||
                ""
              );
              toast.success("Location detected!");
            } else {
              toast.error("Could not get address details. Please enter manually.");
            }
          } catch (error) {
            console.log("Could not reverse geocode:", error);
            toast.error("Could not get address. Please enter manually.");
          }
          setLocationLoading(false);
        },
        (error) => {
          setLocationLoading(false);
          let errorMessage = "Could not detect location. Please enter manually.";
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = "Location access denied. Please enable location permissions.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = "Location unavailable. Please enter manually.";
          } else if (error.code === error.TIMEOUT) {
            errorMessage = "Location request timed out. Please try again.";
          }
          toast.error(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    } else {
      setLocationLoading(false);
      toast.error("Geolocation not supported");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      toast.error(error.message === "Invalid login credentials" 
        ? "Invalid email or password" 
        : error.message
      );
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      forgotPasswordSchema.parse({ email: forgotPasswordEmail });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setForgotPasswordLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset link sent! Check your email.");
      setShowForgotPassword(false);
      setForgotPasswordEmail("");
    }
    setForgotPasswordLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      registerSchema.parse({
        fullName,
        mobile: registerMobile,
        email,
        password: registerPassword,
        address,
        city,
        userType,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email,
      password: registerPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          mobile_number: registerMobile,
          user_type: userType,
          address,
          city,
          latitude,
          longitude,
        },
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("This email is already registered. Please login instead.");
      } else {
        toast.error(error.message);
      }
      setIsLoading(false);
    } else {
      setShowVerificationSent(true);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="gradient-primary p-6 pb-16 rounded-b-[2rem]">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-white">LittleShare</h1>
        </div>
      </div>

      {/* Quote card */}
      <div className="px-4 -mt-8 mb-4">
        <Card className="shadow-card border-0 bg-card">
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm text-muted-foreground italic">"{dailyQuote}"</p>
          </CardContent>
        </Card>
      </div>

      {/* Auth forms */}
      <div className="flex-1 px-4 pb-8">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted">
            <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              Login
            </TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              Register
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="font-heading">Welcome Back!</CardTitle>
                <CardDescription>Enter your email and password to continue</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your password"
                        className="pl-10"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full gradient-primary text-white" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-primary p-0 h-auto"
                      onClick={() => {
                        setForgotPasswordEmail(loginEmail);
                        setShowForgotPassword(true);
                      }}
                    >
                      Forgot Password?
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="font-heading">Join LittleShare</CardTitle>
                <CardDescription>Create your account to start sharing kindness</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* User Type Selection */}
                  <div className="space-y-3">
                    <Label>I want to be a...</Label>
                    <RadioGroup value={userType} onValueChange={(v) => setUserType(v as "donor" | "receiver" | "both")} className="grid grid-cols-3 gap-2">
                      <Label
                        htmlFor="donor"
                        className={`flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          userType === "donor" ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <RadioGroupItem value="donor" id="donor" className="sr-only" />
                        <HandHeart className={`w-6 h-6 mb-1 ${userType === "donor" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-xs font-medium">Donor</span>
                      </Label>
                      <Label
                        htmlFor="receiver"
                        className={`flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          userType === "receiver" ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <RadioGroupItem value="receiver" id="receiver" className="sr-only" />
                        <Heart className={`w-6 h-6 mb-1 ${userType === "receiver" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-xs font-medium">Receiver</span>
                      </Label>
                      <Label
                        htmlFor="both"
                        className={`flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          userType === "both" ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <RadioGroupItem value="both" id="both" className="sr-only" />
                        <Users className={`w-6 h-6 mb-1 ${userType === "both" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-xs font-medium">Both</span>
                      </Label>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="Enter your full name"
                        className="pl-10"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-mobile">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-mobile"
                        type="tel"
                        placeholder="Enter your mobile number"
                        className="pl-10"
                        value={registerMobile}
                        onChange={(e) => setRegisterMobile(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email (for notifications)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Create a password (min 6 characters)"
                        className="pl-10"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="address">Address</Label>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={detectLocation}
                          disabled={locationLoading}
                          className="text-xs text-primary"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          {locationLoading ? "Detecting..." : "Auto-detect"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowLocationPicker(true)}
                          className="text-xs text-primary"
                        >
                          <Map className="w-3 h-3 mr-1" />
                          Pick on Map
                        </Button>
                      </div>
                    </div>
                    <Input
                      id="address"
                      placeholder="Your address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Your city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full gradient-primary text-white" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Location Picker Modal */}
      <LocationPicker
        open={showLocationPicker}
        onOpenChange={setShowLocationPicker}
        initialLat={latitude}
        initialLng={longitude}
        onLocationSelect={handleLocationFromPicker}
      />

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowForgotPassword(false)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your email"
                  className="pl-10"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full gradient-primary text-white" 
              disabled={forgotPasswordLoading}
            >
              {forgotPasswordLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Email Verification Sent Dialog */}
      <Dialog open={showVerificationSent} onOpenChange={setShowVerificationSent}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
              <MailCheck className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-center text-xl">Verify Your Email</DialogTitle>
            <DialogDescription className="text-center">
              We've sent a verification link to <span className="font-semibold text-foreground">{email}</span>. 
              Please check your inbox and click the link to verify your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">Check your email inbox for the verification link</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">If you don't see it, check your spam folder</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">Click the link in the email to activate your account</p>
              </div>
            </div>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => {
                setShowVerificationSent(false);
                setEmail("");
                setRegisterPassword("");
                setFullName("");
                setRegisterMobile("");
                setAddress("");
                setCity("");
              }}
            >
              Back to Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}