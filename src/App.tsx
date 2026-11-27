import React, { useCallback, useEffect, useState } from 'react';
import { Footer } from './components/Footer';
import { AppPage, Header } from './components/Header';
import { WhatsAppFloat } from './components/WhatsAppFloat';
import { EstateProvider, useEstate } from './context/EstateContext';
import { AboutPage } from './pages/AboutPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ContactPage } from './pages/ContactPage';
import { GalleryPage } from './pages/GalleryPage';
import { HomePage } from './pages/HomePage';
import { LegalPage } from './pages/LegalPage';
import { MapPage } from './pages/MapPage';
import { PlotDetailsPage } from './pages/PlotDetailsPage';
import { PlotsListPage } from './pages/PlotsListPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { SiteVisitPage } from './pages/SiteVisitPage';
import type { PlotFilters, PlotItem } from './types/estate';

function parseLocationRoute(pathname: string): {
  page: AppPage;
  plotCode?: string;
} {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/') return { page: 'home' };
  if (clean === '/about') return { page: 'about' };
  if (clean === '/plots') return { page: 'plots' };
  if (clean.startsWith('/plots/')) {
    return { page: 'plot-details', plotCode: decodeURIComponent(clean.slice('/plots/'.length)) };
  }
  if (clean === '/gallery') return { page: 'gallery' };
  if (clean === '/map') return { page: 'map' };
  if (clean === '/site-visit') return { page: 'site-visit' };
  if (clean === '/reviews') return { page: 'reviews' };
  if (clean === '/contact') return { page: 'contact' };
  if (clean === '/privacy') return { page: 'privacy' };
  if (clean === '/terms') return { page: 'terms' };
  if (clean === '/admin') return { page: 'admin' };
  return { page: 'home' };
}

function pageToPath(page: AppPage, plot?: PlotItem | null): string {
  switch (page) {
    case 'home':
      return '/';
    case 'about':
      return '/about';
    case 'plots':
      return '/plots';
    case 'plot-details':
      return plot ? `/plots/${encodeURIComponent(plot.plotCode)}` : '/plots';
    case 'gallery':
      return '/gallery';
    case 'map':
      return '/map';
    case 'site-visit':
      return '/site-visit';
    case 'reviews':
      return '/reviews';
    case 'contact':
      return '/contact';
    case 'privacy':
      return '/privacy';
    case 'terms':
      return '/terms';
    case 'admin':
      return '/admin';
  }
}

const EstateAppShell: React.FC = () => {
  const { settings, plots, quotaExceeded } = useEstate();

  const initialRoute = parseLocationRoute(window.location.pathname);
  const [currentPage, setCurrentPage] = useState<AppPage>(initialRoute.page);
  const [selectedPlotCode, setSelectedPlotCode] = useState<string | null>(
    initialRoute.plotCode ?? null
  );
  const [visitPlotId, setVisitPlotId] = useState<number | null>(null);
  const [plotFilters, setPlotFilters] = useState<PlotFilters>({
    q: '',
    location: 'All',
    status: 'All',
    maxPrice: '',
    minSize: '',
  });

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseLocationRoute(window.location.pathname);
      setCurrentPage(parsed.page);
      setSelectedPlotCode(parsed.plotCode ?? null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((page: AppPage, plot?: PlotItem | null) => {
    const targetPath = pageToPath(page, plot);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setCurrentPage(page);
    if (plot) {
      setSelectedPlotCode(plot.plotCode);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectPlot = useCallback(
    (plot: PlotItem) => {
      navigate('plot-details', plot);
    },
    [navigate]
  );

  const handleBookVisit = useCallback(
    (plot?: PlotItem) => {
      setVisitPlotId(plot ? plot.id : null);
      navigate('site-visit');
    },
    [navigate]
  );

  const handleApplySearch = useCallback(
    (filters: PlotFilters) => {
      setPlotFilters((prev) => ({ ...prev, ...filters }));
      navigate('plots');
    },
    [navigate]
  );

  const activePlot =
    plots.find(
      (p) =>
        p.plotCode.toLowerCase() === (selectedPlotCode || '').toLowerCase() ||
        String(p.id) === selectedPlotCode
    ) || plots[0];

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#10241D]">
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Header
        brandName={settings.companyName}
        currentPage={currentPage}
        onNavigate={(page) => navigate(page)}
      />

      <main className="flex-1">
        {currentPage === 'home' && (
          <HomePage
            onNavigate={(page) => navigate(page)}
            onSelectPlot={handleSelectPlot}
            onBookVisit={handleBookVisit}
            onApplySearch={handleApplySearch}
          />
        )}

        {currentPage === 'about' && <AboutPage onNavigate={(page) => navigate(page)} />}

        {currentPage === 'plots' && (
          <PlotsListPage
            filters={plotFilters}
            onFiltersChange={setPlotFilters}
            onSelectPlot={handleSelectPlot}
            onBookVisit={handleBookVisit}
          />
        )}

        {currentPage === 'plot-details' && activePlot && (
          <PlotDetailsPage
            plot={activePlot}
            onBack={() => navigate('plots')}
            onBookVisit={handleBookVisit}
          />
        )}

        {currentPage === 'gallery' && <GalleryPage onSelectPlot={handleSelectPlot} />}

        {currentPage === 'map' && <MapPage onSelectPlot={handleSelectPlot} />}

        {currentPage === 'site-visit' && <SiteVisitPage preselectedPlotId={visitPlotId} />}

        {currentPage === 'reviews' && <ReviewsPage />}

        {currentPage === 'contact' && <ContactPage />}

        {currentPage === 'privacy' && <LegalPage mode="privacy" />}

        {currentPage === 'terms' && <LegalPage mode="terms" />}

        {currentPage === 'admin' && <AdminDashboardPage />}
      </main>

      <Footer settings={settings} onNavigate={(page) => navigate(page)} />

      <WhatsAppFloat
        whatsappNumber={settings.whatsappNumber}
        companyName={settings.companyName}
      />
    </div>
  );
};

export default function App() {
  return (
    <EstateProvider>
      <EstateAppShell />
    </EstateProvider>
  );
}
