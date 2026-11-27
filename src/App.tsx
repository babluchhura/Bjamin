import { BusFront, SearchX } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import WhatsAppFloat from './components/WhatsAppFloat';
import { EmptyState } from './components/ui';
import { RouterProvider, matchPath, useRouter, Link } from './lib/router';
import { I18nProvider } from './lib/i18n';
import { ToastProvider } from './lib/toast';
import { SiteProvider } from './lib/site';
import { AuthProvider } from './lib/auth';

import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import BusListPage from './pages/BusListPage';
import SeatSelectionPage from './pages/SeatSelectionPage';
import PassengerDetailsPage from './pages/PassengerDetailsPage';
import PaymentPage from './pages/PaymentPage';
import ConfirmationPage from './pages/ConfirmationPage';
import MyBookingsPage from './pages/MyBookingsPage';
import BookingDetailPage from './pages/BookingDetailPage';
import AuthPage from './pages/AuthPage';
import AccountPage from './pages/AccountPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import FaqPage from './pages/FaqPage';
import LegalPage from './pages/LegalPage';

import AdminLayout from './pages/admin/AdminLayout';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminFleetPage from './pages/admin/AdminFleetPage';
import AdminRoutesPage from './pages/admin/AdminRoutesPage';
import AdminCustomersPage from './pages/admin/AdminCustomersPage';
import AdminCouponsPage from './pages/admin/AdminCouponsPage';
import AdminReviewsPage from './pages/admin/AdminReviewsPage';
import AdminContentPage from './pages/admin/AdminContentPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';

function NotFound() {
  return (
    <div className="page-shell py-20">
      <EmptyState
        icon={<SearchX className="size-5" />}
        title="Page not found"
        body="The page you are looking for has moved or never existed."
        action={<Link to="/" className="btn btn-primary">Back to home</Link>}
      />
    </div>
  );
}

function PublicRoutes() {
  const { path } = useRouter();

  const seatMatch = matchPath('/buses/:id/seats', path);
  const confirmationMatch = matchPath('/booking/confirmation/:code', path);
  const bookingMatch = matchPath('/bookings/:code', path);

  if (path === '/') return <HomePage />;
  if (path === '/search') return <SearchPage />;
  if (path === '/buses') return <BusListPage />;
  if (seatMatch) return <SeatSelectionPage tripId={seatMatch.id} />;
  if (path === '/booking/passengers') return <PassengerDetailsPage />;
  if (path === '/booking/payment') return <PaymentPage />;
  if (confirmationMatch) return <ConfirmationPage code={confirmationMatch.code} />;
  if (path === '/bookings') return <MyBookingsPage />;
  if (bookingMatch) return <BookingDetailPage code={bookingMatch.code} />;
  if (path === '/login') return <AuthPage mode="login" />;
  if (path === '/register') return <AuthPage mode="register" />;
  if (path === '/account') return <AccountPage />;
  if (path === '/about') return <AboutPage />;
  if (path === '/contact') return <ContactPage />;
  if (path === '/faq') return <FaqPage />;
  if (path === '/privacy') return <LegalPage mode="privacy" />;
  if (path === '/terms') return <LegalPage mode="terms" />;
  if (path === '/refund') return <LegalPage mode="refund" />;
  return <NotFound />;
}

function AdminRoutes() {
  const { path } = useRouter();
  if (path === '/admin/login') return <AdminLoginPage />;

  const page = (() => {
    if (path === '/admin') return <AdminDashboardPage />;
    if (path === '/admin/bookings') return <AdminBookingsPage />;
    if (path === '/admin/fleet') return <AdminFleetPage />;
    if (path === '/admin/routes') return <AdminRoutesPage />;
    if (path === '/admin/customers') return <AdminCustomersPage />;
    if (path === '/admin/coupons') return <AdminCouponsPage />;
    if (path === '/admin/reviews') return <AdminReviewsPage />;
    if (path === '/admin/content') return <AdminContentPage />;
    if (path === '/admin/reports') return <AdminReportsPage />;
    return <NotFound />;
  })();

  return <AdminLayout>{page}</AdminLayout>;
}

function Shell() {
  const { path } = useRouter();
  const isAdmin = path === '/admin' || path.startsWith('/admin/');

  if (isAdmin) return <AdminRoutes />;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <PublicRoutes />
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <I18nProvider>
        <ToastProvider>
          <SiteProvider>
            <AuthProvider>
              <Shell />
            </AuthProvider>
          </SiteProvider>
        </ToastProvider>
      </I18nProvider>
    </RouterProvider>
  );
}
