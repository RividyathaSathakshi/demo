import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useI18n, type TKey } from '../i18n';
import { ButtonLink, Logo } from './ui';
import { Icon } from './Icon';
import { LanguageSwitcher, ThemeToggle } from './Controls';

const LINKS: { to: string; key: TKey }[] = [
  { to: '/how-it-works', key: 'nav.howItWorks' },
  { to: '/modules', key: 'nav.modules' },
  { to: '/product', key: 'nav.app' },
  { to: '/about', key: 'nav.about' },
  { to: '/privacy', key: 'nav.privacy' },
  { to: '/contact', key: 'nav.contact' },
];

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function SkipLink() {
  const { t } = useI18n();
  return (
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-bg">
      {t('nav.skip')}
    </a>
  );
}

export function SiteLayout() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <header className="sticky top-0 z-40 border-b bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" className="rounded-md" aria-label={`${t('common.appName')}, ${t('nav.home')}`}>
            <Logo />
          </Link>
          <nav aria-label={t('nav.primary')} className="hidden xl:block">
            <ul className="flex items-center gap-1">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    className={({ isActive }) =>
                      `whitespace-nowrap rounded-md px-2.5 py-2 text-label ${isActive ? 'text-ink underline decoration-rose decoration-2 underline-offset-[10px]' : 'text-muted hover:text-ink'}`
                    }
                  >
                    {t(l.key)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-3 md:flex">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
            <ButtonLink to="/app" size="sm" className="hidden whitespace-nowrap sm:inline-flex">
              {t('nav.openApp')}
            </ButtonLink>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg xl:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((o) => !o)}
            >
              <Icon name={open ? 'close' : 'menu'} size={24} label={open ? t('nav.closeMenu') : t('nav.menu')} />
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-nav" aria-label={t('nav.primary')} className="border-t bg-bg xl:hidden">
            <ul className="container-page py-3">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} className="block rounded-md py-3 text-body-lg font-display">
                    {t(l.key)}
                  </NavLink>
                </li>
              ))}
              <li className="mt-3 flex flex-wrap items-center gap-4 border-t pt-4">
                <LanguageSwitcher />
                <ThemeToggle />
              </li>
              <li className="mt-4">
                <ButtonLink to="/app" className="w-full">
                  {t('nav.openApp')}
                </ButtonLink>
              </li>
            </ul>
          </nav>
        )}
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t bg-panel-alt/50">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-2 font-display text-body-lg italic text-ink/80">{t('common.tagline')}</p>
          <p className="mt-3 max-w-sm text-label text-muted">{t('footer.blurb')}</p>
          <p className="mt-4 inline-flex items-center gap-2 text-label">
            <Icon name="lock" size={16} className="text-success" />
            {t('footer.privacyNote')}
          </p>
        </div>
        <nav aria-label={t('footer.product')}>
          <h2 className="text-label font-medium text-muted">{t('footer.product')}</h2>
          <ul className="mt-3 space-y-2 text-label">
            <li><Link className="hover:underline" to="/how-it-works">{t('nav.howItWorks')}</Link></li>
            <li><Link className="hover:underline" to="/modules">{t('nav.modules')}</Link></li>
            <li><Link className="hover:underline" to="/product">{t('nav.app')}</Link></li>
            <li><Link className="hover:underline" to="/app">{t('nav.openApp')}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t('footer.company')}>
          <h2 className="text-label font-medium text-muted">{t('footer.company')}</h2>
          <ul className="mt-3 space-y-2 text-label">
            <li><Link className="hover:underline" to="/about">{t('nav.about')}</Link></li>
            <li><Link className="hover:underline" to="/privacy">{t('nav.privacy')}</Link></li>
            <li><Link className="hover:underline" to="/contact">{t('nav.contact')}</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-5 text-caption text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{t('footer.rights')}</p>
          <p className="max-w-xl">{t('common.disclaimer')}</p>
        </div>
      </div>
    </footer>
  );
}
