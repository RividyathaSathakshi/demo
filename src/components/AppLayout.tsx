import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useI18n, type TKey } from '../i18n';
import { Logo } from './ui';
import { Icon, type IconName } from './Icon';
import { LanguageSwitcher, ThemeToggle } from './Controls';
import { SkipLink } from './SiteLayout';

const TABS: { to: string; key: TKey; icon: IconName; end?: boolean }[] = [
  { to: '/app', key: 'nav.dashboard', icon: 'grid', end: true },
  { to: '/app/scan', key: 'nav.scan', icon: 'scan' },
  { to: '/app/calendar', key: 'nav.calendar', icon: 'calendar' },
  { to: '/app/history', key: 'nav.history', icon: 'clock' },
  { to: '/app/settings', key: 'nav.settings', icon: 'gear' },
];

export function AppLayout() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  // The camera takes over the full screen; onboarding has its own focused layout.
  const immersive = /^\/app\/(scan\/(urine|opk)|welcome)/.test(pathname);
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      {!immersive && (
        <header className="sticky top-0 z-40 border-b bg-bg/90 backdrop-blur">
          <div className="container-page flex h-14 items-center justify-between gap-3">
            <Link to="/app" aria-label={t('nav.dashboard')} className="rounded-md">
              <Logo />
            </Link>
            <nav aria-label={t('nav.appNav')} className="hidden md:block">
              <ul className="flex gap-1">
                {TABS.map((tab) => (
                  <li key={tab.to}>
                    <NavLink
                      to={tab.to}
                      end={tab.end}
                      className={({ isActive }) =>
                        `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-label ${isActive ? 'bg-panel-alt text-ink' : 'text-muted hover:text-ink'}`
                      }
                    >
                      <Icon name={tab.icon} size={16} />
                      {t(tab.key)}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>
              <ThemeToggle />
              <Link to="/" className="hidden text-label text-muted hover:text-ink lg:inline">
                {t('nav.backToSite')}
              </Link>
            </div>
          </div>
        </header>
      )}
      <main id="main" className={`flex-1 ${immersive ? '' : 'pb-24 md:pb-10'}`}>
        <Outlet />
      </main>
      {!immersive && (
        <nav aria-label={t('nav.appNav')} className="fixed inset-x-0 bottom-0 z-40 border-t bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <ul className="grid grid-cols-5">
            {TABS.map((tab) => (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `flex min-h-[60px] flex-col items-center justify-center gap-1 text-caption ${isActive ? 'text-ink' : 'text-muted'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`grid h-7 w-12 place-items-center rounded-full ${isActive ? 'bg-rose/15' : ''}`}>
                        <Icon name={tab.icon} size={20} />
                      </span>
                      {t(tab.key)}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
