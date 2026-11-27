import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSupabaseClient } from '../lib/supabase';
import type {
  AdminAuthConfig,
  AdminUser,
  PlotItem,
  ReviewItem,
  SiteSettingsMap,
} from '../types/estate';

const DEFAULT_SETTINGS: SiteSettingsMap = {
  companyName: 'Bolangir Jamin',
  tagline: 'Clear-Title Residential Land across Bolangir, Bargarh & Nuapada, Odisha',
  heroHeadline: 'Find Your Dream Plot With Us.',
  heroSubheadline:
    'Discover surveyed plots across Bolangir, Bargarh, and Nuapada — from compact residential decimals to full multi-hectare land parcels at every budget.',
  heroImage: '/src/assets/images/hero_plot_estate_1795758691327.jpg',
  aboutTitle: 'Trusted Residential & Hectare Land Across Western Odisha',
  aboutBody:
    'Bolangir Jamin develops residential plots and larger multi-hectare estate parcels across Bolangir, Bargarh, and Nuapada with verified freehold Gharabari/Patta records and paved concrete roads.',
  whatsappNumber: '919876543210',
  contactEmail: 'advisory@bolangirjamin.com',
  contactPhone: '+91 98765 43210',
  officeAddress: 'Station Road, Near Gandhinagar Chowk, Bolangir, Odisha 767001',
  currencySymbol: '₹',
  socialFacebook: 'https://facebook.com',
  socialInstagram: 'https://instagram.com',
  socialLinkedIn: 'https://linkedin.com',
  socialYoutube: 'https://youtube.com',
};

interface EstateContextValue {
  settings: SiteSettingsMap;
  plots: PlotItem[];
  reviews: ReviewItem[];
  googleMapsApiKey: string;
  loading: boolean;
  error: string | null;
  quotaExceeded: boolean;
  authUser: AdminUser | null;
  authToken: string | null;
  userRole: string | null;
  authConfig: AdminAuthConfig | null;
  authLoading: boolean;
  authError: string | null;
  refreshData: () => Promise<void>;
  refreshAuthConfig: () => Promise<void>;
  loginAdmin: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

const EstateContext = createContext<EstateContextValue | undefined>(undefined);

export const EstateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettingsMap>(DEFAULT_SETTINGS);
  const [plots, setPlots] = useState<PlotItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [supabaseConfig, setSupabaseConfig] = useState<{
    url: string;
    anonKey: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Admin session is strictly kept in React memory — never auto-logged in without explicit credentials
  const [authUser, setAuthUser] = useState<AdminUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authConfig, setAuthConfig] = useState<AdminAuthConfig | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const onQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setError(null);
      const [cfg, s, p, r] = await Promise.all([
        api.getPublicConfig().catch(() => ({
          googleMapsApiKey: '',
          supabaseUrl: '',
          supabaseAnonKey: '',
        })),
        api.getSettings(),
        api.getPlots(),
        api.getReviews(),
      ]);
      if (cfg.googleMapsApiKey) {
        setGoogleMapsApiKey(cfg.googleMapsApiKey);
      }
      if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
        setSupabaseConfig({ url: cfg.supabaseUrl, anonKey: cfg.supabaseAnonKey });
      }
      setSettings((prev) => ({ ...prev, ...s }));
      setPlots(p);
      setReviews(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load estate data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAuthConfig = useCallback(async () => {
    setAuthLoading(true);
    try {
      const cfg = await api.getAdminAuthConfig();
      setAuthConfig(cfg);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to load admin auth status.');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
    void refreshAuthConfig();
  }, [refreshData, refreshAuthConfig]);

  const loginAdmin = useCallback(
    async (username: string, password: string) => {
      setAuthError(null);
      setAuthLoading(true);
      try {
        const trimmedIdentifier = username.trim();
        let res: { token: string; user: AdminUser } | null = null;

        if (trimmedIdentifier.includes('@')) {
          const sb = getSupabaseClient(supabaseConfig?.url, supabaseConfig?.anonKey);
          if (sb) {
            let accessToken: string | undefined;
            try {
              const { data } = await sb.auth.signInWithPassword({
                email: trimmedIdentifier,
                password,
              });
              accessToken = data.session?.access_token;
            } catch {
              accessToken = undefined;
            }
            if (accessToken) {
              res = await api.adminLogin({
                supabaseAccessToken: accessToken,
              });
            }
          }
        }

        if (!res) {
          res = await api.adminLogin({ username: trimmedIdentifier, password });
        }

        setAuthToken(res.token);
        setAuthUser(res.user);
        setUserRole(res.user.role);
      } catch (err) {
        setAuthToken(null);
        setAuthUser(null);
        setUserRole(null);
        setAuthError(err instanceof Error ? err.message : 'Invalid username or password.');
        throw err;
      } finally {
        setAuthLoading(false);
      }
    },
    [supabaseConfig]
  );

  const signOut = useCallback(() => {
    const sb = getSupabaseClient(supabaseConfig?.url, supabaseConfig?.anonKey);
    if (sb) {
      void sb.auth.signOut();
    }
    setAuthUser(null);
    setAuthToken(null);
    setUserRole(null);
    setAuthError(null);
    void refreshAuthConfig();
  }, [refreshAuthConfig, supabaseConfig]);

  return (
    <EstateContext.Provider
      value={{
        settings,
        plots,
        reviews,
        googleMapsApiKey,
        loading,
        error,
        quotaExceeded,
        authUser,
        authToken,
        userRole,
        authConfig,
        authLoading,
        authError,
        refreshData,
        refreshAuthConfig,
        loginAdmin,
        signOut,
      }}
    >
      {children}
    </EstateContext.Provider>
  );
};

export function useEstate() {
  const ctx = useContext(EstateContext);
  if (!ctx) throw new Error('useEstate must be used within EstateProvider');
  return ctx;
}
