import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HorarioProvider } from "@/context/HorarioContext";
import { NotificationProvider } from "@/context/NotificationContext";
import ToastContainer from "@/components/ToastContainer";
import Navbar from "@/components/Navbar";
import HomePage from "@/pages/HomePage";
import HorarioPage from "@/pages/HorarioPage";
import AdminPage from "@/pages/AdminPage";
import GuiasPage from "@/pages/GuiasPage";
import FotoPage from "@/pages/FotoPage";
import NotificationsPage from "@/pages/NotificationsPage";
import CambiosPage from "@/pages/CambiosPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <HorarioProvider>
      <NotificationProvider>
        <div className="min-h-screen flex flex-col bg-background">
          <Navbar />
          <ToastContainer />
          <main className="flex-1">
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/horarios" component={HorarioPage} />
              <Route path="/admin" component={AdminPage} />
              <Route path="/guias" component={GuiasPage} />
              <Route path="/foto" component={FotoPage} />
              <Route path="/notificaciones" component={NotificationsPage} />
              <Route path="/cambios" component={CambiosPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </NotificationProvider>
    </HorarioProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
