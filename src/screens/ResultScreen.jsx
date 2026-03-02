import { useEffect, useRef, useState } from "react";
import { Lock, Sparkles, ShoppingBag } from "lucide-react";
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

const ShoppingList = ({ items }) => {
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
    setScreen,
    setUploadedImage,
    setGeneratedImage,
    setVerifiedEmail,
    setIsPremium,
  } = useApp();

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [shoppingItems, setShoppingItems] = useState([]);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState("");
  const [linkUnlocked, setLinkUnlocked] = useState(false);
  const [orientation, setOrientation] = useState("landscape");
  const [resultOrientation, setResultOrientation] = useState("portrait");

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

    const loadResult = async () => {
      setResultLoading(true);
      setImageLoading(true);
      setResultError("");
      setDisplayImageUrl("");

      try {
        let sourceImageUrl = generatedImage || "";

        if (resultId) {
          const res = await fetch(
            `${API_URL}/api/result/${encodeURIComponent(resultId)}`,
          );
          const data = await res.json();

          if (!res.ok) throw new Error(data?.error || "Failed to load result");
          if (!isMounted) return;

          if (data?.originalImageUrl) setUploadedImage(data.originalImageUrl);
          if (data?.imageUrl) {
            setGeneratedImage(data.imageUrl);
            sourceImageUrl = data.imageUrl;
          }
          if (data?.userEmail) setVerifiedEmail(data.userEmail);
          if (data?.isPremium) {
            setIsPremium(true);
            setLinkUnlocked(true);
          }

          const unlockedFromResponse = Boolean(
            data?.shoppingListUnlocked || data?.isPremium,
          );
          if (unlockedFromResponse) setLinkUnlocked(true);
          if (Array.isArray(data?.shoppingList))
            setShoppingItems(data.shoppingList);
        }

        if (!sourceImageUrl) return;
        await preloadImage(sourceImageUrl);
      } catch (err) {
        if (!isMounted) return;
        setResultError(err.message || "Failed to load result");
      } finally {
        if (!isMounted) return;
        setResultLoading(false);
        setImageLoading(false);
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
                  className="w-full h-full object-contain"
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
                  <img
                    src={displayImageUrl}
                    className="w-full h-full object-contain"
                    alt="AI Result"
                  />
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
              <ShoppingList items={shoppingItems} />
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
    </div>
  );
};
