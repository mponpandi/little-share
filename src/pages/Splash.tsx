import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, Heart, Sparkles, HandHeart } from "lucide-react";

const quotes = [
  { text: "Give a little, help a lot", icon: Gift },
  { text: "Small donations create big smiles", icon: Heart },
  { text: "Kindness is the language of love", icon: Sparkles },
  { text: "Share what you can, change a life", icon: HandHeart },
];

export default function Splash() {
  const navigate = useNavigate();
  const [currentQuote, setCurrentQuote] = useState(0);
  const [fadeClass, setFadeClass] = useState("animate-fade-in");

  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setFadeClass("opacity-0");
      setTimeout(() => {
        setCurrentQuote((prev) => (prev + 1) % quotes.length);
        setFadeClass("animate-fade-in");
      }, 300);
    }, 2500);

    const redirectTimer = setTimeout(() => {
      navigate("/auth");
    }, 4000);

    return () => {
      clearInterval(quoteInterval);
      clearTimeout(redirectTimer);
    };
  }, [navigate]);

  const CurrentIcon = quotes[currentQuote].icon;

  return (
    <div className="min-h-screen gradient-splash flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Floating decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-float" style={{ animationDelay: "0s" }} />
        <div className="absolute top-32 right-16 w-12 h-12 bg-white/15 rounded-full animate-float" style={{ animationDelay: "0.5s" }} />
        <div className="absolute bottom-40 left-20 w-16 h-16 bg-white/10 rounded-full animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-white/10 rounded-full animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-5 w-8 h-8 bg-white/20 rounded-full animate-float" style={{ animationDelay: "2s" }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-8">
        {/* Logo */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-glow animate-pulse-soft">
            <Gift className="w-16 h-16 text-white" strokeWidth={1.5} />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-gold rounded-full flex items-center justify-center animate-bounce-gentle">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* App name */}
        <div className="space-y-2">
          <h1 className="text-5xl font-heading font-bold text-white tracking-tight">
            LittleShare
          </h1>
          <p className="text-white/80 text-lg font-medium">
            Micro Donations, Mega Impact
          </p>
        </div>

        {/* Rotating quotes */}
        <div className={`flex flex-col items-center space-y-4 transition-opacity duration-300 ${fadeClass}`}>
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <CurrentIcon className="w-7 h-7 text-white" />
          </div>
          <p className="text-xl text-white font-medium max-w-xs">
            "{quotes[currentQuote].text}"
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex space-x-2 mt-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-white/60 animate-bounce-gentle"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}