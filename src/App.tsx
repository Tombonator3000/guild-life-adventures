import { Component, lazy, Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy-load admin page — pulls in jszip + ElevenLabs service code.
// 99.9% of users never visit /admin/sfx, so keep it off the critical path.
const SFXGeneratorPage = lazy(() => import("./pages/SFXGenerator"));

const queryClient = new QueryClient();

/** Top-level error boundary — prevents blank white screen on unhandled JS errors. */
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'serif',
          backgroundColor: '#1f170a',
          color: '#e8dcc8',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#d4a537' }}>
            Guild Life Adventures
          </h1>
          <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
            Something went wrong loading the game.
          </p>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1.5rem', maxWidth: '400px' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={async () => {
              // Use hardRefresh() which has reload loop protection.
              // Direct location.reload() may serve stale cached HTML (GitHub Pages max-age=600).
              const { hardRefresh } = await import('@/hooks/useAppUpdate');
              await hardRefresh();
            }}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              fontFamily: 'serif',
              background: 'linear-gradient(135deg, hsl(45, 85%, 55%), hsl(35, 70%, 40%))',
              color: '#1f170a',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Clear Cache &amp; Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin/sfx" element={<Suspense fallback={null}><SFXGeneratorPage /></Suspense>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
