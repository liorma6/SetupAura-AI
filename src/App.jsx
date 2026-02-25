import { useState } from 'react';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ScanScreen } from './screens/ScanScreen';
import { AnalysisScreen } from './screens/AnalysisScreen';
import { ThemesScreen } from './screens/ThemesScreen';
import { RecommendationsScreen } from './screens/RecommendationsScreen';
import { AppProvider, useApp } from './context/AppContext';
import { Footer } from './components/layout/Footer';
import { PrivacyModal } from './components/modals/PrivacyModal';
import { AccessibilityModal } from './components/modals/AccessibilityModal';
import { TermsModal } from './components/modals/TermsModal';
import { CookieModal } from './components/modals/CookieModal';
import { AnimatePresence, motion } from 'framer-motion';

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
            <ScanScreen />
          </ScreenWrapper>
        );
      case 'analysis':
        return (
          <ScreenWrapper screenKey="analysis">
            <AnalysisScreen />
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
      default:
        return <WelcomeScreen onStart={() => setScreen('scan')} />;
    }
  };

  return (
    <div className="mobile-wrapper flex flex-col relative overflow-hidden bg-background">
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative w-full">
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>
      </div>

      {/* Global Footer */}
      <Footer
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenAccessibility={() => setIsAccessibilityOpen(true)}
        onOpenTerms={() => setIsTermsOpen(true)}
        onOpenCookies={() => setIsCookiesOpen(true)}
      />

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <AccessibilityModal isOpen={isAccessibilityOpen} onClose={() => setIsAccessibilityOpen(false)} />
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <CookieModal isOpen={isCookiesOpen} onClose={() => setIsCookiesOpen(false)} />
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <InnerApp />
    </AppProvider>
  );
}

export default App;
