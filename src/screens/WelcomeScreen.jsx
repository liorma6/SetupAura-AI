import { useEffect, useRef, useState } from "react";
import { Sparkles, ShieldCheck, X, RotateCcw } from "lucide-react";
import { useApp } from "../context/AppContext";

const API_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3000`;

const BeforeAfterSlider = ({ beforeSrc, afterSrc }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);

  const updateSliderPosition = (clientX) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = Math.min(Math.max(x / rect.width, 0), 1);
    setSliderPosition(ratio * 100);
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateSliderPosition(e.clientX);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    updateSliderPosition(e.clientX);
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      ref={sliderRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative aspect-square md:aspect-[4/5] w-full rounded-2xl overflow-hidden border border-white/15 bg-black/50 touch-none select-none"
    >
      <img
        src={beforeSrc}
        alt="Gaming room before transformation"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={afterSrc}
          alt="Gaming room after transformation"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.8)]"
        style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
      />
      <div
        className="absolute top-1/2 h-10 w-10 rounded-full border-2 border-white bg-black/70 backdrop-blur-sm flex items-center justify-center text-white font-black text-sm"
        style={{
          left: `${sliderPosition}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <>
          <span className="translate-x-[-2px]">|</span>
          <span className="translate-x-[2px]">|</span>
        </>
      </div>
      <div className="absolute left-3 top-3 px-2.5 py-1 rounded-full bg-black/70 border border-white/20 text-[10px] font-bold tracking-widest text-white uppercase">
        Before
      </div>
      <div className="absolute right-3 top-3 px-2.5 py-1 rounded-full bg-black/70 border border-cyan-300/40 text-[10px] font-bold tracking-widest text-cyan-200 uppercase">
        After
      </div>
    </div>
  );
};

const emptyOtp = ["", "", "", "", "", ""];

export const WelcomeScreen = ({ onStart }) => {
  const {
    verifiedEmail,
    setVerifiedEmail,
    setTokensRemaining,
    setIsPremium,
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
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
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

      const normalizedEmail = (data?.email || pendingEmail || "").trim().toLowerCase();
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
          <div className="absolute -top-8 right-0 flex items-center gap-2">
            <button
              onClick={openSignIn}
              className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] tracking-wide text-gray-200 hover:text-white hover:bg-white/20 transition-colors"
            >
              {verifiedEmail ? "Signed In" : "Sign In"}
            </button>
          </div>
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
          <div className="grid grid-cols-3 gap-2 md:gap-5">
            <BeforeAfterSlider
              beforeSrc="/beforeLior.jpeg"
              afterSrc="/afterLior.png"
            />
            <BeforeAfterSlider
              beforeSrc="/beforeHila.JPG"
              afterSrc="/afterHila.png"
            />
            <BeforeAfterSlider
              beforeSrc="/beforeEric.jpg"
              afterSrc="/afterEric.png"
            />
          </div>
        </div>
      </section>

      {isSignInOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1020] p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-black tracking-wide text-lg">Sign In</h3>
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
                {authError && <p className="text-red-400 text-sm">{authError}</p>}
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
                  <p className="text-sm font-semibold break-all">{pendingEmail}</p>
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

                {authError && <p className="text-red-400 text-sm">{authError}</p>}

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
                    {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend Code"}
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
