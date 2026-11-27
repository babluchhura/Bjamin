import { BusFront, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from '../lib/router';
import { useI18n } from '../lib/i18n';
import { useSite } from '../lib/site';

export default function Footer() {
  const { t } = useI18n();
  const { settings } = useSite();

  return (
    <footer className="mt-16 border-t border-mist-200 bg-ink-900 text-slate-300">
      <div className="page-shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
              <BusFront className="size-4.5" />
            </span>
            <span className="font-display text-lg font-semibold text-white">{settings.brandName}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{t('footer.tagline')}</p>
          <div className="mt-4 space-y-2 text-sm text-slate-400">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-400" /> {settings.officeAddress}
            </p>
            <a href={`tel:${settings.supportPhone?.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-white">
              <Phone className="size-4 text-brand-400" /> {settings.supportPhone}
            </a>
            <a href={`mailto:${settings.supportEmail}`} className="flex items-center gap-2 hover:text-white">
              <Mail className="size-4 text-brand-400" /> {settings.supportEmail}
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">{t('footer.company')}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-white">{t('nav.about')}</Link></li>
            <li><Link to="/contact" className="hover:text-white">{t('nav.contact')}</Link></li>
            <li><Link to="/faq" className="hover:text-white">{t('nav.faq')}</Link></li>
            <li><Link to="/search" className="hover:text-white">{t('nav.search')}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">{t('footer.support')}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/bookings" className="hover:text-white">{t('nav.bookings')}</Link></li>
            <li><Link to="/account" className="hover:text-white">{t('nav.account')}</Link></li>
            <li><Link to="/refund" className="hover:text-white">Cancellation & refunds</Link></li>
            <li><a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp support</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">{t('footer.legal')}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/privacy" className="hover:text-white">Privacy policy</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms & conditions</Link></li>
            <li><Link to="/refund" className="hover:text-white">Refund policy</Link></li>
            <li><Link to="/admin/login" className="hover:text-white">Admin login</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="page-shell flex flex-col items-center justify-between gap-2 py-4 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {settings.brandName}. {t('footer.rights')}</p>
          <p>Made in Odisha · Payments secured by Razorpay</p>
        </div>
      </div>
    </footer>
  );
}
