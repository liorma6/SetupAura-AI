import { useEffect, useRef, useState } from "react";
import { Lock, Sparkles, ShoppingBag, X, ZoomIn } from "lucide-react";
import { useApp } from "../context/AppContext";

const API_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3000`;

const ReviewSection = ({
  rating,
  setRating,
  reviewText,
  setReviewText,
  onSubmit,
}) => (
  <div className="w-full max-w-md mb-8">
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <h4 className="text-sm font-bold text-center mb-3">
        Rate Your Experience
      </h4>
      <div className="flex gap-1 justify-center my-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            className={`text-2xl transition-transform hover:scale-125 ${n <= rating ? "text-yellow-400" : "text-gray-600"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        placeholder="Share your thoughts..."
        rows={3}
        className="w-full mt-3 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
      />
      <button
        onClick={onSubmit}
        className="w-full mt-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-bold text-sm hover:scale-105 transition-transform active:scale-95"
      >
        Submit Review
      </button>
    </div>
  </div>
);

const ShoppingList = ({ items, loading }) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300 animate-pulse">
        Loading exact matches...
      </div>
    );
  }

  if (!items || !items.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
        No items found yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-white/10 bg-black/40 p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">{item.name}</p>
              <p className="text-xs text-gray-400 mt-1">{item.description}</p>
            </div>
            <span className="text-xs font-bold text-emerald-300 whitespace-nowrap">
              {item.estimatedPrice}
            </span>
          </div>
          <a
            href={item.buyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs font-bold text-cyan-300 hover:text-cyan-200"
          >
            View Product
          </a>
        </div>
      ))}
    </div>
  );
};

export const ResultScreen = () => {
  const {
    uploadedImage,
    generatedImage,
    verifiedEmail,
    isPremium,
    tokensRemaining,
    setScreen,
    setUploadedImage,
    setGeneratedImage,
    setVerifiedEmail,
    setIsPremium,
  } = useApp();

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [shoppingItems, setShoppingItems] = useState([]);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [resultLoading, setResultLoading] = useState(true); // מתחיל כ-true כדי לא להבהב
  const [resultError, setResultError] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState("");
  const [linkUnlocked, setLinkUnlocked] = useState(false);
  const [orientation, setOrientation] = useState("landscape");
  const [resultOrientation, setResultOrientation] = useState("portrait");
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [showZoomHint, setShowZoomHint] = useState(true);

  const preloadRequestRef = useRef(0);
  const initializedRef = useRef(false);

  const hasUnlockedAccess = Boolean(isPremium || linkUnlocked);

  useEffect(() => {
    if (isPremium) setLinkUnlocked(true);
  }, [isPremium]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const resultId = params.get("id");
    let isMounted = true;
    let didTimeoutWaitingForList = false;

    const POLL_INTERVAL_MS = 1500;
    const MAX_SHOPPING_WAIT_MS = 25000;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const preloadImage = (url) =>
      new Promise((resolve, reject) => {
        const requestId = ++preloadRequestRef.current;
        const preloader = new Image();
        preloader.onload = () => {
          if (!isMounted || requestId !== preloadRequestRef.current) return;
          setDisplayImageUrl(url);
          resolve();
        };
        preloader.onerror = () => {
          if (!isMounted || requestId !== preloadRequestRef.current) return;
          reject(new Error("Failed to load result image"));
        };
        preloader.src = url;
      });

    const fetchResultById = async (id) => {
      const res = await fetch(`${API_URL}/api/result/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load result");
      return data;
    };

    const applyResultData = (data) => {
      if (!data || !isMounted) return;
      if (data?.originalImageUrl) setUploadedImage(data.originalImageUrl);
      if (data?.imageUrl) setGeneratedImage(data.imageUrl);
      if (data?.userEmail) setVerifiedEmail(data.userEmail);
      if (data?.isPremium) setIsPremium(true);

      const unlockedFromResponse = Boolean(
        data?.shoppingListUnlocked || data?.isPremium,
      );
      if (unlockedFromResponse) setLinkUnlocked(true);
    };

    const loadResult = async () => {
      setResultLoading(true);
      setImageLoading(true);
      setShoppingLoading(false);
      setResultError("");
      setDisplayImageUrl("");
      setShoppingItems([]);

      try {
        let sourceImageUrl = generatedImage || "";
        let latestData = null;

        if (resultId) {
          latestData = await fetchResultById(resultId);
          if (!isMounted) return;
          applyResultData(latestData);
          if (latestData?.imageUrl) sourceImageUrl = latestData.imageUrl;
        }

        if (!sourceImageUrl) {
          setResultError("No generated image found.");
          return;
        }

        await preloadImage(sourceImageUrl);
        if (!isMounted) return;

        const unlocked =
          Boolean(latestData?.shoppingListUnlocked || latestData?.isPremium) ||
          Boolean(isPremium || linkUnlocked);

        if (!unlocked) {
          if (Array.isArray(latestData?.shoppingList)) {
            setShoppingItems(latestData.shoppingList);
          }
          return;
        }

        if (!resultId) {
          if (Array.isArray(latestData?.shoppingList)) {
            setShoppingItems(latestData.shoppingList);
          }
          return;
        }

        let resolvedItems = Array.isArray(latestData?.shoppingList)
          ? latestData.shoppingList
          : [];
        let latestStatus = String(latestData?.shoppingListStatus || "").toLowerCase();
        const startWait = Date.now();

        if (resolvedItems.length === 0) {
          setShoppingLoading(true);
        }

        while (
          isMounted &&
          resolvedItems.length === 0 &&
          Date.now() - startWait < MAX_SHOPPING_WAIT_MS &&
          latestStatus !== "failed"
        ) {
          await sleep(POLL_INTERVAL_MS);
          if (!isMounted) return;
          latestData = await fetchResultById(resultId);
          applyResultData(latestData);
          resolvedItems = Array.isArray(latestData?.shoppingList)
            ? latestData.shoppingList
            : [];
          latestStatus = String(latestData?.shoppingListStatus || "").toLowerCase();
        }

        if (!isMounted) return;
        if (resolvedItems.length === 0 && latestStatus !== "failed") {
          didTimeoutWaitingForList = true;
        }
        setShoppingItems(resolvedItems);
      } catch (err) {
        if (!isMounted) return;
        setResultError(err.message || "Failed to load result");
      } finally {
        if (!isMounted) return;
        setResultLoading(false);
        setImageLoading(false);
        setShoppingLoading(false);
        if (didTimeoutWaitingForList) {
          console.warn("[ResultScreen] Shopping list wait timed out.");
        }
      }
    };

    loadResult();

    return () => {
      isMounted = false;
      preloadRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!uploadedImage) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setOrientation(
        img.naturalHeight > img.naturalWidth ? "portrait" : "landscape",
      );
    };
    img.src = uploadedImage;
    return () => {
      cancelled = true;
    };
  }, [uploadedImage]);

  useEffect(() => {
    if (!displayImageUrl) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setResultOrientation(
        img.naturalWidth > img.naturalHeight ? "landscape" : "portrait",
      );
    };
    img.src = displayImageUrl;
    return () => {
      cancelled = true;
    };
  }, [displayImageUrl]);

  useEffect(() => {
    if (!displayImageUrl) return;
    setShowZoomHint(true);

    const timer = window.setTimeout(() => {
      setShowZoomHint(false);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [displayImageUrl]);

  useEffect(() => {
    if (!enlargedImage) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setEnlargedImage(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [enlargedImage]);

  const handleSubmitReview = async () => {
    if (rating === 0) {
      alert("Please select a star rating first.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/submit-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, feedback: reviewText }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      alert("Thank you for your feedback!");
      setRating(0);
      setReviewText("");
    } catch {
      alert("Could not submit review. Please try again.");
    }
  };

  const handleViewShoppingList = () => {
    if (!hasUnlockedAccess) setScreen("pricing");
  };

  const openEnlargedImage = (url) => {
    if (!url) return;
    setShowZoomHint(false);
    setEnlargedImage(url);
  };

  const handleAnotherDesign = async () => {
    // Secure server-side verification
    if (verifiedEmail) {
      try {
        const res = await fetch(
          `${API_URL}/api/user/${encodeURIComponent(verifiedEmail)}`,
        );
        if (res.ok) {
          const userData = await res.json();

          // The ONLY rule: Do you have tokens left?
          if (Number(userData.tokensRemaining || 0) > 0) {
            setScreen("welcome");
          } else {
            setScreen("pricing");
          }
          return;
        }
      } catch (e) {
        console.error("Failed to verify user tokens:", e);
      }
    }
    // Fallback to local state if fetch fails or email is missing
    if (Number(tokensRemaining || 0) > 0) {
      setScreen("welcome");
    } else {
      setScreen("pricing");
    }
  };

  const aspectClass =
    orientation === "portrait" ? "aspect-[2/3]" : "aspect-[16/9]";
  const isLandscapeResult = resultOrientation === "landscape";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center p-6 overflow-y-auto pb-20">
      <header className="w-full max-w-md flex items-center justify-between mb-8 pt-4">
        <h1 className="text-xl font-bold text-purple-400">SetupAura AI</h1>
      </header>

      <div className="w-full max-w-md mb-8">
        <div
          className={`flex ${isLandscapeResult ? "flex-col gap-4" : "flex-row gap-3"}`}
        >
          <div className={isLandscapeResult ? "w-full" : "w-1/2"}>
            <p className="text-xs font-bold text-gray-500 mb-1.5 tracking-wider">
              BEFORE
            </p>
            <div
              className={`relative rounded-2xl overflow-hidden border border-white/10 bg-black/50 w-full ${aspectClass} flex items-center justify-center`}
            >
              {uploadedImage ? (
                <img
                  src={uploadedImage}
                  alt="Before"
                  className="w-full h-full object-contain cursor-zoom-in"
                  onClick={() => openEnlargedImage(uploadedImage)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  No uploaded image
                </div>
              )}
            </div>
          </div>
          {isLandscapeResult && (
            <div className="w-full text-center text-[10px] font-bold tracking-[0.2em] uppercase text-purple-300/80">
              After
            </div>
          )}
          <div className={isLandscapeResult ? "w-full" : "w-1/2"}>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <p className="text-xs font-bold text-purple-400 tracking-widest uppercase">
                AI Upgrade
              </p>
            </div>
            <div
              className={`relative rounded-2xl overflow-hidden border-2 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)] bg-black/60 w-full ${aspectClass} flex items-center justify-center`}
            >
              {displayImageUrl &&
                !imageLoading &&
                !resultLoading &&
                !resultError && (
                  <>
                    <img
                      src={displayImageUrl}
                      className="w-full h-full object-contain cursor-zoom-in"
                      alt="AI Result"
                      onClick={() => openEnlargedImage(displayImageUrl)}
                    />
                    {showZoomHint && (
                      <div className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/65 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white/80 backdrop-blur-sm">
                        <span className="inline-flex items-center gap-1">
                          <ZoomIn className="w-3 h-3" />
                          Tap to enlarge
                        </span>
                      </div>
                    )}
                  </>
                )}
              {!resultError && (resultLoading || imageLoading) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
                  <div className="w-8 h-8 rounded-full border-2 border-purple-300/30 border-t-purple-300 animate-spin" />
                  <div className="w-32 h-2 rounded-full bg-white/10 animate-pulse" />
                </div>
              )}
              {!resultLoading && !imageLoading && resultError && (
                <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm px-4 text-center">
                  {resultError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleAnotherDesign}
        className="w-full max-w-md py-3.5 mb-6 rounded-xl font-extrabold text-[15px] tracking-wide bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_20px_rgba(192,38,211,0.4)] hover:shadow-[0_0_30px_rgba(192,38,211,0.6)] hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 border border-fuchsia-400/30"
      >
        <Sparkles className="w-5 h-5 animate-pulse text-fuchsia-200" />
        GENERATE ANOTHER DESIGN
      </button>

      <div className="w-full max-w-md mb-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold tracking-wider uppercase">
              Exact-Match Shopping List
            </h3>
          </div>
          {hasUnlockedAccess ? (
            <div className="space-y-4">
              <ShoppingList
                items={shoppingItems}
                loading={resultLoading || shoppingLoading}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-black/40 p-4 relative overflow-hidden">
                <div className="blur-sm select-none pointer-events-none space-y-2 text-sm text-gray-300">
                  <div className="flex justify-between">
                    <span>RGB Light Strip</span>
                    <span>$29.99</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dual Monitor Arm</span>
                    <span>$64.99</span>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="px-3 py-1 rounded-full bg-black/70 border border-white/20 text-xs font-bold tracking-wide flex items-center gap-1.5">
                    <Lock className="w-3 h-3" />
                    LOCKED
                  </div>
                </div>
              </div>
              <button
                onClick={handleViewShoppingList}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-[1.01] active:scale-95 transition-transform"
              >
                Unlock Shopping List
              </button>
            </div>
          )}
        </div>
      </div>

      <ReviewSection
        rating={rating}
        setRating={setRating}
        reviewText={reviewText}
        setReviewText={setReviewText}
        onSubmit={handleSubmitReview}
      />

      {enlargedImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setEnlargedImage(null);
            }}
            className="absolute top-4 right-4 p-2 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors"
            aria-label="Close enlarged image"
          >
            <X className="w-5 h-5" />
          </button>

          <img
            src={enlargedImage}
            alt="Enlarged AI Result"
            className="max-w-full max-h-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
