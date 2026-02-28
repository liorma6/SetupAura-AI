import { useState, useEffect } from 'react';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ScanScreen } from './screens/ScanScreen';
import { ThemesScreen } from './screens/ThemesScreen';
import { RecommendationsScreen } from './screens/RecommendationsScreen';
import { ResultScreen } from './screens/ResultScreen';
import { PricingScreen } from './screens/PricingScreen';
import { AppProvider, useApp } from './context/AppContext';
import { Footer } from './components/layout/Footer';
import { PrivacyModal } from './components/modals/PrivacyModal';
import { AccessibilityModal } from './components/modals/AccessibilityModal';
import { TermsModal } from './components/modals/TermsModal';
import { CookieModal } from './components/modals/CookieModal';
import { AnimatePresence, motion } from 'framer-motion';
import { BrowserRouter as Router, Link } from 'react-router-dom';

const CookieBanner = ({ onOpenCookies }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) setIsVisible(true);
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-purple-500/30 p-4 z-[9999] flex flex-col md:flex-row items-center justify-between gap-4"
    >
      <p className="text-xs text-gray-300 text-center md:text-left">
        We use cookies to improve your experience and for analytics. By continuing to use this site, you agree to our
        <button onClick={onOpenCookies} className="text-purple-400 underline ml-1">Cookie Policy</button>.
      </p>
      <button
        onClick={acceptCookies}
        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 px-6 rounded-full transition-all"
      >
        Got it
      </button>
    </motion.div>
  );
};

const ScreenWrapper = ({ children, screenKey }) => (
  <motion.div
    key={screenKey}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3 }}
    className="h-full flex flex-col"
  >
    {children}
  </motion.div>
);

const InnerApp = () => {
  const { screen, setScreen } = useApp();
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isCookiesOpen, setIsCookiesOpen] = useState(false);

  useEffect(() => {
    if (window.fbq) {
      window.fbq('trackCustom', 'ScreenViewed', { screen_name: screen });
    }
  }, [screen]);

  const handleHomeClick = (e) => {
    e.preventDefault();
    setScreen('welcome');
  };

  const renderScreen = () => {
    switch (screen) {
      case 'welcome':
        return (
          <ScreenWrapper screenKey="welcome">
            <WelcomeScreen onStart={() => setScreen('scan')} />
          </ScreenWrapper>
        );
      case 'scan':
        return (
          <ScreenWrapper screenKey="scan">
            <ScanScreen onOpenTerms={() => setIsTermsOpen(true)} onOpenPrivacy={() => setIsPrivacyOpen(true)} />
          </ScreenWrapper>
        );
      case 'themes':
        return (
          <ScreenWrapper screenKey="themes">
            <ThemesScreen />
          </ScreenWrapper>
        );
      case 'recommendations':
        return (
          <ScreenWrapper screenKey="recommendations">
            <RecommendationsScreen />
          </ScreenWrapper>
        );
      case 'result':
        return (
          <ScreenWrapper screenKey="result">
            <ResultScreen />
          </ScreenWrapper>
        );
      case 'pricing':
        return (
          <ScreenWrapper screenKey="pricing">
            <PricingScreen />
          </ScreenWrapper>
        );
      default:
        return <WelcomeScreen onStart={() => setScreen('scan')} />;
    }
  };

  return (
    <div className="mobile-wrapper flex flex-col relative overflow-hidden bg-background">
      <header className="fixed top-0 w-full z-50 h-16 bg-black/80 backdrop-blur-md border-b border-gray-800 flex justify-center items-center">
        <div className="w-full max-w-[480px] h-full flex justify-center items-center px-4">
          <Link
            to="/"
            onClick={handleHomeClick}
            className="text-lg font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 drop-shadow-[0_0_10px_rgba(168,85,247,0.35)] hover:opacity-80 transition-opacity"
          >
            SetupAura AI
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative w-full pt-20">
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>
      </div>

      <Footer
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenAccessibility={() => setIsAccessibilityOpen(true)}
      />

      <CookieBanner onOpenCookies={() => setIsCookiesOpen(true)} />

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <AccessibilityModal isOpen={isAccessibilityOpen} onClose={() => setIsAccessibilityOpen(false)} />
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <CookieModal isOpen={isCookiesOpen} onClose={() => setIsCookiesOpen(false)} />
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppProvider>
        <InnerApp />
      </AppProvider>
    </Router>
  );
}

export default App;
