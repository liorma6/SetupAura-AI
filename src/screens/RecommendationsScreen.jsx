import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Mail,
  ShieldCheck,
  RotateCcw,
  CheckCircle,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const API_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3000`;
const DEFAULT_THEME = "MODERN GAMING (RGB)";

const getStoredEmail = () => {
  try {
    return (localStorage.getItem("setupaura_email") || "").trim();
  } catch {
    return "";
  }
};

const markTrialUsed = () => {
  try {
    localStorage.setItem("setupaura_trial_used", "true");
  } catch {}
};

export const RecommendationsScreen = () => {
  const {
    uploadedImage,
    selectedTheme,
    verifiedEmail,
    isPremium,
    setVerifiedEmail,
    setGeneratedImage,
    tokensRemaining,
    setTokensRemaining,
    setIsPremium,
    setScreen,
  } = useApp();

  const [flow, setFlow] = useState(verifiedEmail ? "loading" : "email");
  const [emailInput, setEmailInput] = useState(
    verifiedEmail || getStoredEmail(),
  );
  const [pendingEmail, setPendingEmail] = useState("");
  const [error, setError] = useState("");

  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [showPremiumSuccess, setShowPremiumSuccess] = useState(false);
  const otpRefs = useRef([]);
  const cooldownRef = useRef(null);
  const isGeneratingRef = useRef(false);

  const toBase64 = useCallback(
    (blobUrl) =>
      new Promise((resolve, reject) => {
        fetch(blobUrl)
          .then((r) => r.blob())
          .then((blob) => {
            const imgUrl = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
              const maxSize = 1200;
              const width = img.width || 1;
              const height = img.height || 1;
              const scale = Math.min(1, maxSize / Math.max(width, height));
              const targetWidth = Math.max(1, Math.round(width * scale));
              const targetHeight = Math.max(1, Math.round(height * scale));
              const canvas = document.createElement("canvas");
              canvas.width = targetWidth;
              canvas.height = targetHeight;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                URL.revokeObjectURL(imgUrl);
                reject(new Error("Canvas not supported"));
                return;
              }
              ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
              const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
              URL.revokeObjectURL(imgUrl);
              resolve(compressedBase64);
            };
            img.onerror = (error) => {
              URL.revokeObjectURL(imgUrl);
              reject(error);
            };
            img.src = imgUrl;
          })
          .catch(reject);
      }),
    [],
  );

  const startCooldown = () => {
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

  const generateForEmail = useCallback(
    async (emailToUse) => {
      if (isGeneratingRef.current) {
        return;
      }

      if (verifiedEmail && Number(tokensRemaining || 0) <= 0) {
        setScreen("pricing");
        setFlow("email");
        return;
      }

      if (!uploadedImage) {
        setError(
          "No image found. Please go back and upload a photo of your setup.",
        );
        setFlow("email");
        return;
      }

      const normalizedEmail = (emailToUse || "").trim();
      if (!normalizedEmail) {
        setFlow("email");
        return;
      }

      setError("");
      isGeneratingRef.current = true;

      try {
        let imagePayload = uploadedImage;
        if (imagePayload && imagePayload.startsWith("blob:")) {
          imagePayload = await toBase64(imagePayload);
        }

        let isUserPremium = isPremium; // current state from context

        // Quick pre-flight check if we don't know the status yet
        if (!isUserPremium && emailToUse) {
          try {
            const userRes = await fetch(
              `${API_URL}/api/user/${encodeURIComponent(emailToUse)}`,
            );
            if (userRes.ok) {
              const userData = await userRes.json();
              isUserPremium = Boolean(userData.isPremium);
            }
          } catch (e) {
            console.error("Pre-flight premium check failed", e);
          }
        }

        if (isUserPremium) {
          setFlow("loading"); // Show short validation state
          const requestPromise = fetch(`${API_URL}/api/generate-design`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: imagePayload,
              email: normalizedEmail,
              theme: selectedTheme || DEFAULT_THEME,
            }),
          });
          // Wait 2.5 seconds for any fast safety errors
          const timeoutPromise = new Promise((resolve) =>
            setTimeout(() => resolve("TIMEOUT"), 2500),
          );
          try {
            const result = await Promise.race([requestPromise, timeoutPromise]);
            if (result === "TIMEOUT") {
              // Safety check passed (no fast error). It's generating!
              setShowPremiumSuccess(true);

              // Let it finish in the background to update tokens silently
              requestPromise
                .then(async (res) => {
                  if (res.ok) {
                    const data = await res.json().catch(() => ({}));
                    if (typeof data.tokensRemaining === "number") {
                      setTokensRemaining(data.tokensRemaining);
                    }
                  }
                })
                .catch(console.error);

              return;
            }
            // If it resolved before timeout (fast error like safety violation)
            const response = result;
            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
              setError(
                responseData.message ||
                  responseData.error ||
                  "Generation rejected. Please try another image.",
              );
              setFlow("email");
              return;
            }
            // Fast success fallback
            if (typeof responseData.tokensRemaining === "number") {
              setTokensRemaining(responseData.tokensRemaining);
            }
            setShowPremiumSuccess(true);
            return;
          } catch (err) {
            setError("Connection error. Please try again.");
            setFlow("email");
            return;
          }
        }

        setFlow("loading");
        console.log(
          "DEBUG: Attempting to fetch from URL:",
          import.meta.env.VITE_API_URL,
        );
        const res = await fetch(`${API_URL}/api/generate-design`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: imagePayload,
            email: normalizedEmail,
            theme: selectedTheme || DEFAULT_THEME,
          }),
        });

        const data = await res.json();

        if (
          res.status === 403 &&
          (data.error === "OUT_OF_TOKENS" || data.paywall)
        ) {
          setTokensRemaining(0);
          setScreen("pricing");
          return;
        }

        if (res.status === 400 && data.error === "INVALID_IMAGE") {
          setError(data.message);
          setFlow("email");
          return;
        }

        if (!res.ok) {
          throw new Error(data.error || "Generation failed");
        }

        if (!data?.imageUrl) {
          throw new Error("Generation succeeded but no image URL was returned");
        }

        setGeneratedImage(data.imageUrl);
        if (typeof data.tokensRemaining === "number") {
          setTokensRemaining(data.tokensRemaining);
        } else {
          setTokensRemaining(Math.max(0, Number(tokensRemaining || 0) - 1));
        }
        setIsPremium(Boolean(data.isPremium));
        markTrialUsed();
        if (data.backgroundProcessing === true) {
          setShowPremiumSuccess(true);
          return;
        }
        setScreen("result");
      } catch (error) {
        console.error("DEBUG: Full Error Object:", error);
        if (error.response) {
          console.error(
            "DEBUG: Server responded with status:",
            error.response.status,
          );
          console.error("DEBUG: Server response data:", error.response.data);
        } else if (error.request) {
          console.error(
            "DEBUG: No response received. Request details:",
            error.request,
          );
        } else {
          console.error("DEBUG: Error setting up request:", error.message);
        }
        setError(`Load failed. URL: ${API_URL}/api/generate-design`);
        setFlow("email");
      } finally {
        isGeneratingRef.current = false;
      }
    },
    [
      uploadedImage,
      selectedTheme,
      isPremium,
      setGeneratedImage,
      tokensRemaining,
      setTokensRemaining,
      setIsPremium,
      setScreen,
      toBase64,
    ],
  );

  useEffect(() => {
    if (flow === "loading" && verifiedEmail) {
      generateForEmail(verifiedEmail);
    }
  }, [flow, verifiedEmail, generateForEmail]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email) return;

    setSendingOtp(true);
    setOtpError("");

    try {
      console.log(
        "DEBUG: Attempting to fetch from URL:",
        import.meta.env.VITE_API_URL,
      );
      const res = await fetch(`${API_URL}/api/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setPendingEmail(email);
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpError("");
      setFlow("otp");
      startCooldown();
    } catch (error) {
      console.error("DEBUG: Full Error Object:", error);
      if (error.response) {
        console.error(
          "DEBUG: Server responded with status:",
          error.response.status,
        );
        console.error("DEBUG: Server response data:", error.response.data);
      } else if (error.request) {
        console.error(
          "DEBUG: No response received. Request details:",
          error.request,
        );
      } else {
        console.error("DEBUG: Error setting up request:", error.message);
      }
      setOtpError(`Load failed. URL: ${API_URL}/api/auth/request-otp`);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCooldown > 0) return;
    setSendingOtp(true);
    setOtpError("");
    try {
      console.log(
        "DEBUG: Attempting to fetch from URL:",
        import.meta.env.VITE_API_URL,
      );
      const res = await fetch(`${API_URL}/api/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend code");
      setOtpDigits(["", "", "", "", "", ""]);
      startCooldown();
    } catch (error) {
      console.error("DEBUG: Full Error Object:", error);
      if (error.response) {
        console.error(
          "DEBUG: Server responded with status:",
          error.response.status,
        );
        console.error("DEBUG: Server response data:", error.response.data);
      } else if (error.request) {
        console.error(
          "DEBUG: No response received. Request details:",
          error.request,
        );
      } else {
        console.error("DEBUG: Error setting up request:", error.message);
      }
      setOtpError(`Load failed. URL: ${API_URL}/api/auth/request-otp`);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpDigitChange = (index, value) => {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = char;
    setOtpDigits(next);
    setOtpError("");
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
    const next = [...otpDigits];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
    setOtpDigits(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join("");
    if (code.length < 6) {
      setOtpError("Please enter the full 6-digit code.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    try {
      console.log(
        "DEBUG: Attempting to fetch from URL:",
        import.meta.env.VITE_API_URL,
      );
      const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.message || "Verification failed");
        return;
      }
      setOtpLoading(false);
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "Lead");
      }
      if (typeof window !== "undefined" && window.posthog) {
        window.posthog.capture("Lead");
        const userEmail = pendingEmail.trim();
        window.posthog.identify(userEmail, { email: userEmail });
      }

      const verified = pendingEmail.trim();
      try {
        localStorage.setItem("setupaura_email", verified);
      } catch {}
      setVerifiedEmail(verified);
      if (typeof data.tokensRemaining === "number") {
        setTokensRemaining(data.tokensRemaining);
      }
      setIsPremium(Boolean(data?.isPremium));
      setFlow("loading");
      await generateForEmail(verified);
    } catch (error) {
      console.error("DEBUG: Full Error Object:", error);
      if (error.response) {
        console.error(
          "DEBUG: Server responded with status:",
          error.response.status,
        );
        console.error("DEBUG: Server response data:", error.response.data);
      } else if (error.request) {
        console.error(
          "DEBUG: No response received. Request details:",
          error.request,
        );
      } else {
        console.error("DEBUG: Error setting up request:", error.message);
      }
      setOtpError(`Load failed. URL: ${API_URL}/api/auth/verify-otp`);
    } finally {
      setOtpLoading(false);
    }
  };

  if (showPremiumSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-in zoom-in duration-500">
        <div className="w-24 h-24 mb-8 flex items-center justify-center">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>

        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-4 tracking-tight">
          Success! Design Approved
        </h2>

        <p className="text-gray-300 text-base max-w-md mx-auto leading-relaxed mb-10">
          It will take a few moments and will be delivered directly to your
          email. In the meantime, you can safely return to the home page.
        </p>

        <button
          onClick={() => setScreen("welcome")}
          className="py-3 px-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 text-white shadow-lg shadow-purple-500/25"
        >
          Return to Home
        </button>
      </div>
    );
  }

  if (flow === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-spin h-16 w-16 border-4 border-purple-500 border-t-transparent rounded-full mb-8" />
        <h2 className="text-2xl font-bold animate-pulse">
          Designing your dream room...
        </h2>
        <p className="text-gray-400 mt-4">
          This takes about a minute. We'll also email you the result! You can
          safely leave this page and come back later.
        </p>
      </div>
    );
  }

  if (flow === "otp") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
        <div
          className="w-20 h-20 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-6"
          style={{ boxShadow: "0 0 30px rgba(168,85,247,0.2)" }}
        >
          <ShieldCheck className="w-10 h-10 text-purple-400" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Check Your Email</h2>
        <p className="text-gray-400 mb-2">We sent a 6-digit code to</p>
        <p className="text-purple-400 font-semibold mb-8">{pendingEmail}</p>

        <div className="flex gap-3 mb-6" onPaste={handleOtpPaste}>
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
              className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-white/5 text-white outline-none transition-all ${digit ? "border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]" : "border-white/15 focus:border-purple-500"}`}
            />
          ))}
        </div>

        {otpError && <p className="text-red-400 text-sm mb-4">{otpError}</p>}
        <p className="text-gray-600 text-xs mb-6">Code expires in 10 minutes</p>

        <button
          onClick={handleVerifyOtp}
          disabled={otpLoading || otpDigits.join("").length < 6}
          className="w-full max-w-sm py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold hover:scale-105 transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 mb-4"
        >
          <ShieldCheck className="w-5 h-5" />
          {otpLoading ? "Verifying..." : "Verify & Continue"}
        </button>

        <div className="flex items-center gap-3 text-sm text-gray-500">
          <button
            onClick={handleResendOtp}
            disabled={otpCooldown > 0 || sendingOtp}
            className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend Code"}
          </button>
          <span>·</span>
          <button
            onClick={() => {
              setPendingEmail("");
              setFlow("email");
              setOtpError("");
            }}
            className="hover:text-white transition-colors"
          >
            Change Email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
      <Mail className="w-16 h-16 text-purple-500 mb-6" />
      <h2 className="text-3xl font-bold mb-2">Try For Free</h2>
      <p className="text-gray-400 mb-8">
        Enter your email to generate your design.
      </p>
      <form onSubmit={handleEmailSubmit} className="w-full max-w-sm space-y-4">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 outline-none"
        />
        {(otpError || error) && (
          <p className="text-red-400 text-sm">{otpError || error}</p>
        )}
        <button
          type="submit"
          disabled={sendingOtp}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold hover:scale-105 transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <Sparkles className="w-5 h-5" />
          {sendingOtp ? "Sending Code..." : "Send Verification Code"}
        </button>
      </form>
    </div>
  );
};
