import { lazy, Suspense, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { I18nProvider, useI18n } from './i18n';
import { ThemeSync } from './components/Controls';
import { ScrollToTop, SiteLayout } from './components/SiteLayout';
import { AppLayout } from './components/AppLayout';
import { useAppState } from './store/store';
import { HomePage } from './pages/HomePage';

// Marketing pages beyond the home page and every app screen are code-split.
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const ModulesPage = lazy(() => import('./pages/ModulesPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const Onboarding = lazy(() => import('./features/onboarding/Onboarding'));
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const ScanChooser = lazy(() => import('./features/scan/ScanChooser'));
const ScanFlow = lazy(() => import('./features/scan/ScanFlow'));
const ManualEntry = lazy(() => import('./features/manual/ManualEntry'));
const SavedResult = lazy(() => import('./features/results/SavedResult'));
const CalendarPage = lazy(() => import('./features/calendar/CalendarPage'));
const HistoryPage = lazy(() => import('./features/history/HistoryPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));

function Loading() {
  const { t } = useI18n();
  return (
    <div className="grid min-h-[50vh] place-items-center text-muted" role="status">
      {t('common.loading')}
    </div>
  );
}

/** Screening requires onboarding consent first. */
function RequireConsent({ children }: { children: ReactNode }) {
  const { consentAcceptedAt, profile } = useAppState();
  const location = useLocation();
  if (!consentAcceptedAt || !profile) {
    return <Navigate to={`/app/welcome?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <HashRouter>
      <I18nProvider>
        <ThemeSync />
        <ScrollToTop />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<HomePage />} />
              <Route path="how-it-works" element={<HowItWorksPage />} />
              <Route path="modules" element={<ModulesPage />} />
              <Route path="product" element={<ProductPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            <Route path="app" element={<AppLayout />}>
              <Route path="welcome" element={<Onboarding />} />
              <Route index element={<RequireConsent><Dashboard /></RequireConsent>} />
              <Route path="scan" element={<RequireConsent><ScanChooser /></RequireConsent>} />
              <Route path="scan/:module" element={<RequireConsent><ScanFlow /></RequireConsent>} />
              <Route path="manual/:module" element={<RequireConsent><ManualEntry /></RequireConsent>} />
              <Route path="result/:id" element={<RequireConsent><SavedResult /></RequireConsent>} />
              <Route path="calendar" element={<RequireConsent><CalendarPage /></RequireConsent>} />
              <Route path="history" element={<RequireConsent><HistoryPage /></RequireConsent>} />
              <Route path="settings" element={<RequireConsent><SettingsPage /></RequireConsent>} />
            </Route>
          </Routes>
        </Suspense>
      </I18nProvider>
    </HashRouter>
  );
}
