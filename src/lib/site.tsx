import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';

type SiteValue = {
  settings: Record<string, string>;
  paymentsConfigured: boolean;
  razorpayKeyId: string;
  ready: boolean;
  reload: () => Promise<void>;
};

const FALLBACK: Record<string, string> = {
  brandName: 'Utkal Yatra',
  tagline: "Odisha's trusted online bus ticket booking platform",
  supportPhone: '+91 90909 09090',
  supportEmail: 'support@utkalyatra.in',
  whatsappNumber: '919090909090',
  officeAddress: 'Saheed Nagar, Bhubaneswar, Odisha 751007',
  currencySymbol: '₹',
};

const SiteContext = createContext<SiteValue>({
  settings: FALLBACK,
  paymentsConfigured: false,
  razorpayKeyId: '',
  ready: false,
  reload: async () => undefined,
});

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>(FALLBACK);
  const [paymentsConfigured, setPaymentsConfigured] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [ready, setReady] = useState(false);

  const reload = async () => {
    try {
      const config = await api.config();
      setSettings({ ...FALLBACK, ...config.settings });
      setPaymentsConfigured(config.paymentsConfigured);
      setRazorpayKeyId(config.razorpayKeyId);
    } catch (error) {
      console.error('Failed to load site configuration', error);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const value = useMemo(
    () => ({ settings, paymentsConfigured, razorpayKeyId, ready, reload }),
    [settings, paymentsConfigured, razorpayKeyId, ready]
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  return useContext(SiteContext);
}
