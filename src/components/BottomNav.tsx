import { NavLink, useLocation } from "react-router-dom";
import { Home, Plus, FileText, MessageSquare, User } from "lucide-react";

const navItems = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/my-posts", icon: FileText, label: "My Posts" },
  { path: "/add-item", icon: Plus, label: "Add", isCenter: true },
  { path: "/requests", icon: MessageSquare, label: "Requests" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="relative -mt-6"
              >
                <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center space-y-1 p-2 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
              <span className={`text-xs ${isActive ? "font-semibold" : ""}`}>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}