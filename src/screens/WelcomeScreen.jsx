import { useState, useEffect, useRef } from "react";
import { Sparkles, X, ShieldCheck, RotateCcw } from "lucide-react";
import { useApp } from "../context/AppContext";

const API_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3000`;
const emptyOtp = ["", "", "", "", "", ""];
const showcasePairs = [
  { before: "/beforeLior.webp", after: "/afterLior.webp" },
  { before: "/Before2.webp", after: "/After2.webp" },
  { before: "/Before3.webp", after: "/After3.webp" },
];

export const WelcomeScreen = ({ onStart }) => {
  const {
    verifiedEmail,
    setVerifiedEmail,
    setTokensRemaining,
    setIsPremium,
    setScreen,
  } = useApp();

  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [step, setStep] = useState("email");
  const [emailInput, setEmailInput] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(emptyOtp);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [authError, setAuthError] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const cooldownRef = useRef(null);
  const otpRefs = useRef([]);

  const closeSignIn = () => {
    setIsSignInOpen(false);
    setStep("email");
    setPendingEmail("");
    setOtpDigits(emptyOtp);
    setAuthError("");
    setSendingOtp(false);
    setVerifyingOtp(false);
    setOtpCooldown(0);
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current);
      cooldownRef.current = null;
    }
  };

  const openSignIn = () => {
    setEmailInput((verifiedEmail || "").trim());
    setAuthError("");
    setStep("email");
    setIsSignInOpen(true);
  };

  const startCooldown = () => {
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current);
      cooldownRef.current = null;
    }
    setOtpCooldown(30);
    cooldownRef.current = setInterval(() => {
      setOtpCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) {
            clearInterval(cooldownRef.current);
            cooldownRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleOpenSignIn = () => openSignIn();
    window.addEventListener("open-sign-in", handleOpenSignIn);
    return () => window.removeEventListener("open-sign-in", handleOpenSignIn);
  }, [verifiedEmail]);

  useEffect(() => {
    showcasePairs.forEach(({ before, after }) => {
      const beforeImage = new Image();
      beforeImage.src = before;

      const afterImage = new Image();
      afterImage.src = after;
    });
  }, []);

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
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Failed to send code");
      }
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
    if (char && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const next = [...emptyOtp];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || "";
    }
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Verification failed");
      }
      try {
        // Facebook Pixel Tracking
        if (typeof window !== "undefined" && window.fbq) {
          window.fbq("track", "Lead");
        }
        // PostHog Tracking & Identification
        if (typeof window !== "undefined" && window.posthog) {
          window.posthog.capture("Lead");
          const userEmail = pendingEmail.trim();
          window.posthog.identify(userEmail, { email: userEmail });
        }
      } catch (err) {
        console.warn("Tracking skipped or not initialized", err);
      }

      const normalizedEmail = (data?.email || pendingEmail || "")
        .trim()
        .toLowerCase();
      const tokens = Math.max(0, Number(data?.tokensRemaining) || 0);
      const premium = Boolean(data?.isPremium);

      setVerifiedEmail(normalizedEmail);
      setTokensRemaining(tokens);
      setIsPremium(premium);

      try {
        localStorage.setItem("setupaura_email", normalizedEmail);
      } catch {}

      closeSignIn();
    } catch (err) {
      setAuthError(err.message || "Verification failed");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleNextPair = () => {
    setCurrentIndex((prev) => (prev + 1) % showcasePairs.length);
  };

  const handlePrevPair = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? showcasePairs.length - 1 : prev - 1,
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-[#060811]">
      <section className="relative w-full min-h-[68vh] flex flex-col justify-center items-center text-center overflow-hidden px-8 py-14">
        <video
          src="/hero-video.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 flex flex-col items-center w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-5xl sm:text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-4 drop-shadow-[0_0_20px_rgba(191,0,255,0.6)]">
              SetupAura
            </h1>
            <p className="text-gray-300 text-base sm:text-lg uppercase tracking-[0.2em] font-bold">
              Design Your Dream Room.
              <br />
              Transform your space.
            </p>
          </div>

          <button
            onClick={onStart}
            className="relative group px-9 py-4 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-black text-lg uppercase tracking-widest rounded-full shadow-[0_0_40px_rgba(191,0,255,0.6),0_0_80px_rgba(191,0,255,0.3)] hover:shadow-[0_0_60px_rgba(191,0,255,0.9),0_0_120px_rgba(191,0,255,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 animate-pulse hover:animate-none flex items-center gap-3"
          >
            <Sparkles className="w-6 h-6" />
            Start Designing
          </button>

          <p className="text-xs text-gray-400 mt-6 max-w-[240px] mx-auto tracking-wide">
            Create a room concept tailored to your style.
          </p>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-12 -mt-2">
        <div className="w-full max-w-6xl mx-auto">
          <div className="mb-4 text-center">
            <p className="text-xs font-bold tracking-[0.22em] text-cyan-300 uppercase">
              Showcase
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Before / After Gaming Room Upgrades
            </h2>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:p-5">
            {/* THIS IS THE MAGIC LINE: flex-row ensures side-by-side everywhere */}
            <div className="flex flex-row gap-2 md:gap-5">
              <div className="w-1/2 min-w-0">
                <p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-gray-300 uppercase">
                  BEFORE
                </p>
                <div className="relative aspect-[4/5] sm:aspect-[4/3] rounded-2xl overflow-hidden border border-white/15 bg-black/50">
                  <img
                    key={`before-${currentIndex}`}
                    src={showcasePairs[currentIndex].before}
                    alt="Room before transformation"
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover transition-opacity duration-200 ease-out"
                  />
                </div>
              </div>
              <div className="w-1/2 min-w-0">
                <p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-cyan-300 uppercase">
                  AFTER
                </p>
                <div className="relative aspect-[4/5] sm:aspect-[4/3] rounded-2xl overflow-hidden border border-cyan-300/30 bg-black/50">
                  <img
                    key={`after-${currentIndex}`}
                    src={showcasePairs[currentIndex].after}
                    alt="Room after transformation"
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover transition-opacity duration-200 ease-out"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 md:gap-3">
              <button
                onClick={handlePrevPair}
                className="px-4 py-2 rounded-full border border-white/20 bg-white/5 text-white text-sm font-bold hover:bg-white/10 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-gray-400 font-semibold tracking-wider">
                {currentIndex + 1} / {showcasePairs.length}
              </span>
              <button
                onClick={handleNextPair}
                className="px-4 py-2 rounded-full border border-cyan-300/30 bg-cyan-500/10 text-cyan-200 text-sm font-bold hover:bg-cyan-500/20 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

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

            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <button
                onClick={() => {
                  closeSignIn();
                  setScreen("pricing");
                }}
                className="text-xs text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 w-full"
              >
                Want to unlock all styles?{" "}
                <span className="text-purple-400 font-bold">Get Premium ✨</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
