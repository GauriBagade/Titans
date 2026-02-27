import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Welcome from "./pages/Welcome";
import Onboarding from "./pages/Onboarding";
import Index from "./pages/Index";
import CropSoilSelection from "./pages/CropSoilSelection";
import Advisory from "./pages/Advisory";
import CropCalendar from "./pages/CropCalendar";
import Settings from "./pages/Settings";
import Farms from "./pages/Farms";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const queryClient = new QueryClient();

/* -------------------- ROUTE GUARDS (UNCHANGED) -------------------- */

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  return <>{children}</>;
};

const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const { profileChecked } = useAuth();
  const isOnboardingComplete =
    localStorage.getItem("onboardingComplete") === "true";

  if (!profileChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isOnboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthGuard>
      <OnboardingGuard>{children}</OnboardingGuard>
    </AuthGuard>
  );
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const hasSelectedLanguage = !!localStorage.getItem("selectedLanguage");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route
        path="/auth"
        element={
          !hasSelectedLanguage ? (
            <Navigate to="/welcome" replace />
          ) : user ? (
            <Navigate to="/" replace />
          ) : (
            <Auth />
          )
        }
      />
      <Route
        path="/onboarding"
        element={
          !hasSelectedLanguage ? (
            <Navigate to="/welcome" replace />
          ) : (
            <AuthGuard>
              <Onboarding />
            </AuthGuard>
          )
        }
      />
      <Route
        path="/"
        element={
          !hasSelectedLanguage ? (
            <Navigate to="/welcome" replace />
          ) : (
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          )
        }
      />
      <Route
        path="/crop-selection"
        element={
          !hasSelectedLanguage ? (
            <Navigate to="/welcome" replace />
          ) : (
            <ProtectedRoute>
              <CropSoilSelection />
            </ProtectedRoute>
          )
        }
      />
      <Route
        path="/advisory"
        element={
          !hasSelectedLanguage ? (
            <Navigate to="/welcome" replace />
          ) : (
            <ProtectedRoute>
              <Advisory />
            </ProtectedRoute>
          )
        }
      />
      <Route
        path="/crop-calendar"
        element={
          !hasSelectedLanguage ? (
            <Navigate to="/welcome" replace />
          ) : (
            <ProtectedRoute>
              <CropCalendar />
            </ProtectedRoute>
          )
        }
      />
      <Route
        path="/farms"
        element={
          !hasSelectedLanguage ? (
            <Navigate to="/welcome" replace />
          ) : (
            <ProtectedRoute>
              <Farms />
            </ProtectedRoute>
          )
        }
      />
      <Route
        path="/settings"
        element={
          !hasSelectedLanguage ? (
            <Navigate to="/welcome" replace />
          ) : (
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          )
        }
      />
      <Route path="/install" element={<Install />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

/* -------------------- UPDATED APP COMPONENT -------------------- */

function App() {

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let removeRegistration: (() => void) | undefined;
    let removeRegistrationError: (() => void) | undefined;
    let removeReceived: (() => void) | undefined;

    const registerDevice = async (token: string) => {
      const rawLocation = localStorage.getItem("userGeoLocation");
      if (!rawLocation) {
        localStorage.setItem("pushDeviceToken", token);
        return;
      }

      try {
        const { lat, lon } = JSON.parse(rawLocation);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          return;
        }

        const registerAlertDevice = httpsCallable(functions, "registerAlertDevice");
        await registerAlertDevice({
          token,
          lat,
          lon,
          platform: Capacitor.getPlatform(),
        });
        localStorage.setItem("pushDeviceToken", token);
      } catch (e) {
        console.error("Device registration failed:", e);
      }
    };

    const bootstrap = async () => {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive === "granted") {
        await PushNotifications.register();
      }

      const registrationHandle = await PushNotifications.addListener("registration", (token) => {
        console.log("FCM token received");
        void registerDevice(token.value);
      });
      removeRegistration = () => registrationHandle.remove();

      const registrationErrorHandle = await PushNotifications.addListener("registrationError", (err) => {
        console.error("Push registration error:", err);
      });
      removeRegistrationError = () => registrationErrorHandle.remove();

      const receivedHandle = await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("Push notification received:", notification);
      });
      removeReceived = () => receivedHandle.remove();
    };

    void bootstrap();

    return () => {
      removeRegistration?.();
      removeRegistrationError?.();
      removeReceived?.();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
