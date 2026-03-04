import { useState, useEffect, useRef } from "react";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { ScanScreen } from "./screens/ScanScreen";
import { ThemesScreen } from "./screens/ThemesScreen";
import { RecommendationsScreen } from "./screens/RecommendationsScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { PricingScreen } from "./screens/PricingScreen";
import { AdminScreen } from "./screens/AdminScreen";
import { AppProvider, useApp } from "./context/AppContext";
import { Footer } from "./components/layout/Footer";
import { PrivacyModal } from "./components/modals/PrivacyModal";
import { AccessibilityModal } from "./components/modals/AccessibilityModal";
import { TermsModal } from "./components/modals/TermsModal";
import { CookieModal } from "./components/modals/CookieModal";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShieldCheck, RotateCcw } from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3000`;
const emptyOtp = ["", "", "", "", "", ""];

const CookieBanner = ({ onOpenCookies }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setIsVisible(true);
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "true");
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
        We use cookies to improve your experience and for analytics. By
        continuing to use this site, you agree to our
        <button
          onClick={onOpenCookies}
          className="text-purple-400 underline ml-1"
        >
          Cookie Policy
        </button>
        .
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
  const {
    screen,
    setScreen,
    verifiedEmail,
    setVerifiedEmail,
    tokensRemaining,
    setTokensRemaining,
    setIsPremium,
  } = useApp();
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isCookiesOpen, setIsCookiesOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Global Auth Modal States
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [step, setStep] = useState("email");
  const [emailInput, setEmailInput] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(emptyOtp);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [authError, setAuthError] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);

  const cooldownRef = useRef(null);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (window.fbq) {
      window.fbq("trackCustom", "ScreenViewed", { screen_name: screen });
    }
  }, [screen]);

  // Global Auth Modal Functions
  const closeSignIn = () => {
    setIsSignInOpen(false);
    // Delay resetting states so the modal completely disappears first
    setTimeout(() => {
      setStep("email");
      setPendingEmail("");
      setOtpDigits(["", "", "", "", "", ""]);
      setAuthError("");
      setSendingOtp(false);
      setVerifyingOtp(false);
      setOtpCooldown(0);
    }, 200);
  };

  const openSignIn = () => {
    setEmailInput("");
    setAuthError("");
    setStep("email");
    setIsSignInOpen(true);
  };

  const startCooldown = () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setOtpCooldown(30);
    cooldownRef.current = setInterval(() => {
      setOtpCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  useEffect(() => {
    const handleOpenSignIn = () => openSignIn();
    window.addEventListener("open-sign-in", handleOpenSignIn);
    return () => window.removeEventListener("open-sign-in", handleOpenSignIn);
  }, [verifiedEmail]);

  const requestOtp = async (email) => {
    setSendingOtp(true);
    setAuthError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.message || data?.error || "Failed to send code");
      setPendingEmail(email);
      setOtpDigits(emptyOtp);
      setStep("otp");
      startCooldown();
      setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch (err) {
      setAuthError(err.message || "Failed to send code");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    await requestOtp(email);
  };

  const handleResendOtp = async () => {
    if (!pendingEmail || otpCooldown > 0 || sendingOtp) return;
    await requestOtp(pendingEmail);
  };

  const handleOtpDigitChange = (index, value) => {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = char;
    setOtpDigits(next);
    setAuthError("");
    if (char && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0)
      otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const next = [...emptyOtp];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
    setOtpDigits(next);
    setAuthError("");
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join("");
    if (code.length < 6) {
      setAuthError("Please enter the full 6-digit code.");
      return;
    }
    setVerifyingOtp(true);
    setAuthError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || "Verification failed");
      
      const normalizedEmail = (data?.email || pendingEmail || "").trim().toLowerCase();
      
      // 1. Update global context first
      setVerifiedEmail(normalizedEmail);
      setTokensRemaining(Math.max(0, Number(data?.tokensRemaining) || 0));
      setIsPremium(Boolean(data?.isPremium));
      try { localStorage.setItem("setupaura_email", normalizedEmail); } catch {}

      // 2. Safely close the modal
      closeSignIn();

      // 3. Route the user after a tiny delay to ensure smooth transition
      setTimeout(() => {
        if (normalizedEmail === 'liorma6@gmail.com') {
          const secret = window.prompt("Enter Admin Secret:");
          if (secret) {
            localStorage.setItem("setupaura_admin_secret", secret);
            setScreen('admin');
          } else {
            setScreen('scan'); // fallback if canceled
          }
        } else if (screen === 'welcome') {
          // Auto-redirect normal users to scan screen for better UX
          setScreen('scan');
        }
      }, 100);
    } catch (err) { 
      setAuthError(err.message || "Verification failed"); 
    } finally { 
      setVerifyingOtp(false); 
    }
  };

  const handleHomeClick = (e) => {
    e.preventDefault();
    setScreen("welcome");
  };

  const handleStart = () => {
    if (verifiedEmail && Number(tokensRemaining || 0) <= 0) {
      setScreen("pricing");
      return;
    }
    setScreen("scan");
  };

  const renderScreen = () => {
    switch (screen) {
      case "welcome":
        return (
          <ScreenWrapper screenKey="welcome">
            <WelcomeScreen onStart={handleStart} />
          </ScreenWrapper>
        );
      case "scan":
        return (
          <ScreenWrapper screenKey="scan">
            <ScanScreen
              onOpenTerms={() => setIsTermsOpen(true)}
              onOpenPrivacy={() => setIsPrivacyOpen(true)}
            />
          </ScreenWrapper>
        );
      case "themes":
        return (
          <ScreenWrapper screenKey="themes">
            <ThemesScreen />
          </ScreenWrapper>
        );
      case "recommendations":
        return (
          <ScreenWrapper screenKey="recommendations">
            <RecommendationsScreen />
          </ScreenWrapper>
        );
      case "result":
        return (
          <ScreenWrapper screenKey="result">
            <ResultScreen />
          </ScreenWrapper>
        );
      case "pricing":
        return (
          <ScreenWrapper screenKey="pricing">
            <PricingScreen />
          </ScreenWrapper>
        );
      case "admin":
        return (
          <ScreenWrapper screenKey="admin">
            <AdminScreen />
          </ScreenWrapper>
        );
      default:
        return <WelcomeScreen onStart={handleStart} />;
    }
  };

  return (
    <div className="mobile-wrapper flex flex-col relative overflow-hidden bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <Header
        onHomeClick={handleHomeClick}
        onMenuToggle={() => setIsSidebarOpen(true)}
      />

      <div className="flex-1 overflow-hidden relative w-full pt-20">
        <AnimatePresence mode="wait">{renderScreen()}</AnimatePresence>
      </div>

      <Footer
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenAccessibility={() => setIsAccessibilityOpen(true)}
      />

      <CookieBanner onOpenCookies={() => setIsCookiesOpen(true)} />

      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
      <AccessibilityModal
        isOpen={isAccessibilityOpen}
        onClose={() => setIsAccessibilityOpen(false)}
      />
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <CookieModal
        isOpen={isCookiesOpen}
        onClose={() => setIsCookiesOpen(false)}
      />

      {/* Global Sign In Modal */}
      {isSignInOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1020] p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-black tracking-wide text-lg">
                Sign In
              </h3>
              <button
                onClick={closeSignIn}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-gray-300" />
              </button>
            </div>
            {step === "email" ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 outline-none"
                />
                {authError && (
                  <p className="text-red-400 text-sm">{authError}</p>
                )}
                <button
                  type="submit"
                  disabled={sendingOtp}
                  className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-[1.01] active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {sendingOtp ? "Sending Code..." : "Send 6-Digit Code"}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-purple-300">
                  <ShieldCheck className="w-4 h-4" />
                  <p className="text-sm font-semibold break-all">
                    {pendingEmail}
                  </p>
                </div>
                <div className="flex gap-2.5" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-full h-12 text-center text-xl font-bold rounded-xl border border-white/15 bg-white/5 text-white outline-none focus:border-purple-500"
                    />
                  ))}
                </div>
                {authError && (
                  <p className="text-red-400 text-sm">{authError}</p>
                )}
                <button
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp || otpDigits.join("").length < 6}
                  className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-[1.01] active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {verifyingOtp ? "Verifying..." : "Verify & Sign In"}
                </button>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <button
                    onClick={handleResendOtp}
                    disabled={otpCooldown > 0 || sendingOtp}
                    className="inline-flex items-center gap-1 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {otpCooldown > 0
                      ? `Resend in ${otpCooldown}s`
                      : "Resend Code"}
                  </button>
                  <button
                    onClick={() => {
                      setStep("email");
                      setAuthError("");
                    }}
                    className="hover:text-white"
                  >
                    Change Email
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
