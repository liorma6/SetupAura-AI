import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
const showcasePairs = [
  { before: "/beforeLior.webp", after: "/afterLior.webp" },
  { before: "/Before2.webp", after: "/After2.webp" },
  { before: "/Before3.webp", after: "/After3.webp" },
];

export const WelcomeScreen = ({ onStart }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    showcasePairs.forEach(({ before, after }) => {
      const beforeImage = new Image();
      beforeImage.src = before;
      const afterImage = new Image();
      afterImage.src = after;
    });
  }, []);

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

    </div>
  );
};
