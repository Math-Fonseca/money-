import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import LoginForm from "@/components/login-form";

function Router({ userData, onLogout, onUpdateProfile }: {
  userData: { name: string; email: string; profileImage?: string } | null;
  onLogout: () => void;
  onUpdateProfile: (user: { name: string; email: string; profileImage?: string }) => void;
}) {
  if (!userData) {
    return null;
  }

  return (
    <Switch>
      <Route path="/" component={() => 
        <Dashboard userData={userData} onLogout={onLogout} onUpdateProfile={onUpdateProfile} />
      } />
      <Route path="/dashboard" component={() => 
        <Dashboard userData={userData} onLogout={onLogout} onUpdateProfile={onUpdateProfile} />
      } />
    </Switch>
  );
}

function App() {
  const [userData, setUserData] = useState<{ name: string; email: string; profileImage?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se há dados de usuário salvos
    const savedUserData = localStorage.getItem("userData");
    if (savedUserData) {
      setUserData(JSON.parse(savedUserData));
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (user: { name: string; email: string; profileImage?: string }) => {
    setUserData(user);
  };

  const handleLogout = () => {
    setUserData(null);
  };

  const handleUpdateProfile = (user: { name: string; email: string; profileImage?: string }) => {
    setUserData(user);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {userData ? (
          <Router userData={userData} onLogout={handleLogout} onUpdateProfile={handleUpdateProfile} />
        ) : (
          <LoginForm onLogin={handleLogin} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
