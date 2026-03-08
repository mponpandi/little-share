import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "./PageTransition";
import Splash from "@/pages/Splash";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Browse from "@/pages/Browse";
import AddItem from "@/pages/AddItem";
import MyPosts from "@/pages/MyPosts";
import ItemsReceived from "@/pages/ItemsReceived";
import Requests from "@/pages/Requests";
import Profile from "@/pages/Profile";
import EditProfile from "@/pages/EditProfile";
import Settings from "@/pages/Settings";
import Privacy from "@/pages/Privacy";
import Help from "@/pages/Help";
import Notifications from "@/pages/Notifications";
import MapPage from "@/pages/Map";
import ItemDetail from "@/pages/ItemDetail";
import EmailConfirmation from "@/pages/EmailConfirmation";
import NotFound from "@/pages/NotFound";

const routes = [
  { path: "/", element: <Splash /> },
  { path: "/auth", element: <Auth /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/email-confirmation", element: <EmailConfirmation /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/browse", element: <Browse /> },
  { path: "/add-item", element: <AddItem /> },
  { path: "/my-posts", element: <MyPosts /> },
  { path: "/requests", element: <Requests /> },
  { path: "/profile", element: <Profile /> },
  { path: "/edit-profile", element: <EditProfile /> },
  { path: "/settings", element: <Settings /> },
  { path: "/privacy", element: <Privacy /> },
  { path: "/help", element: <Help /> },
  { path: "/notifications", element: <Notifications /> },
  { path: "/map", element: <MapPage /> },
  { path: "/item/:id", element: <ItemDetail /> },
  { path: "*", element: <NotFound /> },
];

export function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {routes.map(({ path, element }) => (
          <Route
            key={path}
            path={path}
            element={<PageTransition>{element}</PageTransition>}
          />
        ))}
      </Routes>
    </AnimatePresence>
  );
}
