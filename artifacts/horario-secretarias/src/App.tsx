import { Component, type ReactNode } from "react";
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
import TareasPage from "@/pages/TareasPage";
import NotFound from "@/pages/not-found";
import { UserProvider } from "@/context/UserContext";
import UserSelectionModal from "@/components/UserSelectionModal";

const queryClient = new QueryClient();

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-background">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-lg text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-xl font-bold text-foreground">Ocurrió un problema</h1>
            <p className="text-sm text-muted-foreground">
              La página encontró un error inesperado. Por favor recarga la página para continuar.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Router() {
  return (
    <ErrorBoundary>
      <HorarioProvider>
        <UserProvider>
        <NotificationProvider>
          <UserSelectionModal />
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
                <Route path="/tareas" component={TareasPage} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </NotificationProvider>
        </UserProvider>
      </HorarioProvider>
    </ErrorBoundary>
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
