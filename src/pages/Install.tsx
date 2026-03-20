import { ArrowLeft, Download, Smartphone, Monitor, Apple, Chrome, MoreVertical, Share, Plus, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Install Little Share</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Download className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Get the App Experience</h2>
          <p className="text-muted-foreground text-sm">
            Install Little Share on your device for instant access, offline support, and a native app feel — no app store needed.
          </p>
        </div>

        {/* Quick Install Button (Chrome/Edge on Android/Desktop) */}
        {deferredPrompt && !isInstalled && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 text-center space-y-3">
              <p className="font-semibold text-foreground">Quick Install Available!</p>
              <Button onClick={handleInstallClick} className="w-full gap-2">
                <Download className="h-4 w-4" />
                Install Now
              </Button>
            </CardContent>
          </Card>
        )}

        {isInstalled && (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="p-4 text-center">
              <p className="font-semibold text-accent-foreground">✅ Little Share is already installed!</p>
            </CardContent>
          </Card>
        )}

        {/* Device-specific instructions */}
        <Tabs defaultValue="android" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="android" className="gap-1.5 text-xs sm:text-sm">
              <Smartphone className="h-4 w-4" />
              Android
            </TabsTrigger>
            <TabsTrigger value="ios" className="gap-1.5 text-xs sm:text-sm">
              <Apple className="h-4 w-4" />
              iOS
            </TabsTrigger>
            <TabsTrigger value="desktop" className="gap-1.5 text-xs sm:text-sm">
              <Monitor className="h-4 w-4" />
              Desktop
            </TabsTrigger>
          </TabsList>

          {/* Android */}
          <TabsContent value="android" className="mt-4 space-y-4">
            <h3 className="font-bold text-foreground">Chrome (Recommended)</h3>
            <div className="space-y-3">
              <Step number={1} icon={<Chrome className="h-4 w-4" />}>
                Open <strong>Little Share</strong> in Chrome browser
              </Step>
              <Step number={2} icon={<MoreVertical className="h-4 w-4" />}>
                Tap the <strong>three-dot menu</strong> (⋮) at the top-right corner
              </Step>
              <Step number={3} icon={<Plus className="h-4 w-4" />}>
                Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>
              </Step>
              <Step number={4} icon={<Download className="h-4 w-4" />}>
                Tap <strong>"Install"</strong> in the confirmation dialog
              </Step>
            </div>
            <InfoBox>
              The app icon will appear on your home screen. It opens in full-screen mode just like a native app!
            </InfoBox>

            <h3 className="font-bold text-foreground mt-6">Samsung Internet</h3>
            <div className="space-y-3">
              <Step number={1}>Open Little Share in Samsung Internet</Step>
              <Step number={2}>Tap the <strong>menu icon</strong> (☰) at the bottom</Step>
              <Step number={3}>Tap <strong>"Add page to" → "Home screen"</strong></Step>
            </div>
          </TabsContent>

          {/* iOS */}
          <TabsContent value="ios" className="mt-4 space-y-4">
            <h3 className="font-bold text-foreground">Safari (Required)</h3>
            <div className="space-y-3">
              <Step number={1} icon={<Smartphone className="h-4 w-4" />}>
                Open <strong>Little Share</strong> in <strong>Safari</strong> (not Chrome or Firefox)
              </Step>
              <Step number={2} icon={<Share className="h-4 w-4" />}>
                Tap the <strong>Share button</strong> (□↑) at the bottom of the screen
              </Step>
              <Step number={3}>
                Scroll down and tap <strong>"Add to Home Screen"</strong>
              </Step>
              <Step number={4} icon={<Plus className="h-4 w-4" />}>
                Tap <strong>"Add"</strong> in the top-right corner
              </Step>
            </div>
            <InfoBox type="warning">
              ⚠️ On iOS, you <strong>must use Safari</strong>. Other browsers don't support Add to Home Screen for PWAs.
            </InfoBox>
            <InfoBox>
              Works on iPhone and iPad running iOS 16.4 or later for the best experience.
            </InfoBox>
          </TabsContent>

          {/* Desktop */}
          <TabsContent value="desktop" className="mt-4 space-y-4">
            <h3 className="font-bold text-foreground">Chrome / Edge</h3>
            <div className="space-y-3">
              <Step number={1} icon={<Chrome className="h-4 w-4" />}>
                Open <strong>Little Share</strong> in Chrome or Edge
              </Step>
              <Step number={2} icon={<Download className="h-4 w-4" />}>
                Click the <strong>install icon</strong> (⊕) in the address bar, or click the three-dot menu → <strong>"Install Little Share"</strong>
              </Step>
              <Step number={3}>
                Click <strong>"Install"</strong> in the confirmation popup
              </Step>
            </div>
            <InfoBox>
              The app will open in its own window. You can find it in your Start menu (Windows) or Applications folder (Mac).
            </InfoBox>

            <h3 className="font-bold text-foreground mt-6">Firefox</h3>
            <InfoBox type="warning">
              ⚠️ Firefox desktop doesn't support PWA installation natively. Use Chrome or Edge for the best experience.
            </InfoBox>
          </TabsContent>
        </Tabs>

        {/* Benefits */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-bold text-foreground">Why install?</h3>
            <div className="grid grid-cols-2 gap-3">
              <Benefit emoji="⚡" text="Instant launch from home screen" />
              <Benefit emoji="📱" text="Full-screen native feel" />
              <Benefit emoji="🔔" text="Push notifications" />
              <Benefit emoji="📶" text="Works with poor connection" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Step = ({ number, icon, children }: { number: number; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex gap-3 items-start">
    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
      {number}
    </div>
    <div className="flex items-center gap-2 text-sm text-foreground pt-0.5">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span>{children}</span>
    </div>
  </div>
);

const InfoBox = ({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" }) => (
  <div className={`rounded-lg p-3 text-xs ${type === "warning" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
    {children}
  </div>
);

const Benefit = ({ emoji, text }: { emoji: string; text: string }) => (
  <div className="flex items-start gap-2 text-xs text-muted-foreground">
    <span className="text-base">{emoji}</span>
    <span>{text}</span>
  </div>
);

export default Install;
