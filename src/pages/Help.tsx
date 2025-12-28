import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import {
  ArrowLeft,
  HelpCircle,
  MessageCircle,
  FileText,
  Mail,
  ChevronRight,
  Heart,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do I donate an item?",
    answer:
      "Tap the + button in the navigation bar, fill out the item details including a photo and description, then submit. Your item will be visible to receivers nearby.",
  },
  {
    question: "How do I request an item?",
    answer:
      "Browse available items on the dashboard or map. When you find something you need, tap on it and send a request to the donor.",
  },
  {
    question: "Is LittleShare free to use?",
    answer:
      "Yes! LittleShare is completely free. We believe in community-powered giving without any fees or hidden costs.",
  },
  {
    question: "How are donors verified?",
    answer:
      "All users register with their phone number. We encourage meeting in safe public places for pickups.",
  },
  {
    question: "Can I donate anonymously?",
    answer:
      "Yes, you can choose to hide your contact details. Receivers will still be able to request items, but communication will happen through the app.",
  },
];

export default function Help() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-gold p-4 pb-6 rounded-b-[2rem]">
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
            Help & Support
          </h1>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Quick Links */}
        <Card className="border-0 shadow-card">
          <CardContent className="p-0 divide-y divide-border">
            <button className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Chat with Us</p>
                  <p className="text-sm text-muted-foreground">
                    Get help in real-time
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-accent" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Email Support</p>
                  <p className="text-sm text-muted-foreground">
                    support@littleshare.app
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Terms & Conditions</p>
                  <p className="text-sm text-muted-foreground">
                    Read our policies
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>

        {/* FAQs */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg flex items-center">
              <HelpCircle className="w-5 h-5 mr-2 text-primary" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-sm font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center pt-4 pb-6">
          <div className="flex items-center justify-center text-muted-foreground">
            <span className="text-sm">Made with</span>
            <Heart className="w-4 h-4 mx-1 text-destructive fill-destructive" />
            <span className="text-sm">for communities</span>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}