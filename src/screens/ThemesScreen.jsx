import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { ScreenContainer } from "../components/ui/ScreenContainer";
import { Button } from "../components/ui/Button";
import { useApp } from "../context/AppContext";

const themes = [
  {
    id: "MODERN GAMING (RGB)",
    name: "MODERN GAMING (RGB)",
    status: "FREE",
    isLocked: false,
    image:
      "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1400&q=80",
    tint: "from-cyan-500/40 via-transparent to-violet-500/50",
  },
  {
    id: "ANIME",
    name: "ANIME",
    status: "PREMIUM",
    isLocked: true,
    image:
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1400&q=80",
    tint: "from-pink-500/50 via-transparent to-indigo-500/50",
  },
  {
    id: "HEAVY METAL",
    name: "HEAVY METAL",
    status: "PREMIUM",
    isLocked: true,
    image:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1400&q=80",
    tint: "from-red-700/55 via-transparent to-zinc-700/60",
  },
  {
    id: "RETRO ARCADE",
    name: "RETRO ARCADE",
    status: "PREMIUM",
    isLocked: true,
    image:
      "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1400&q=80",
    tint: "from-fuchsia-600/45 via-transparent to-amber-400/40",
  },
  {
    id: "FANTASY RPG",
    name: "FANTASY RPG",
    status: "PREMIUM",
    isLocked: true,
    image:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=80",
    tint: "from-emerald-700/55 via-transparent to-amber-700/55",
  },
  {
    id: "SCI-FI COMMAND CENTER",
    name: "SCI-FI COMMAND CENTER",
    status: "PREMIUM",
    isLocked: true,
    image:
      "https://images.unsplash.com/photo-1562408590-e32931084e23?auto=format&fit=crop&w=1400&q=80",
    tint: "from-sky-500/45 via-transparent to-blue-700/60",
  },
];

export const ThemesScreen = () => {
  const {
    setSelectedTheme,
    setScreen,
    isPremium,
    verifiedEmail,
    tokensRemaining,
  } = useApp();

  const normalizedThemes = useMemo(
    () =>
      themes.map((theme) => ({
        ...theme,
        isLocked: theme.status === "PREMIUM" ? !isPremium : false,
      })),
    [isPremium],
  );

  const [localSelection, setLocalSelection] = useState("MODERN GAMING (RGB)");

  const handleNext = () => {
    if (verifiedEmail && Number(tokensRemaining || 0) <= 0) {
      setScreen("pricing");
      return;
    }

    setSelectedTheme(localSelection);
    setScreen("recommendations");
  };

  return (
    <ScreenContainer>
      <div className="flex-1 overflow-y-auto pb-28">
        <header className="mb-6">
          <h2 className="text-xl font-display font-extrabold tracking-wide text-white">
            STEP 2: CUSTOMIZE YOUR THEME
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Choose an aesthetic style for your dream gaming room
          </p>
        </header>

        <div className="grid grid-cols-2 gap-4">
          {normalizedThemes.map((theme) => {
            const selected = localSelection === theme.id;
            return (
              <motion.button
                key={theme.id}
                onClick={() => !theme.isLocked && setLocalSelection(theme.id)}
                whileTap={{ scale: 0.98 }}
                className={`group relative aspect-[3/4] overflow-hidden rounded-2xl border text-left transition-all duration-300 ${
                  selected
                    ? "border-primary shadow-[0_0_32px_rgba(168,85,247,0.5)]"
                    : "border-white/10 hover:border-white/30"
                } ${theme.isLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <img
                  src={theme.image}
                  alt={theme.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${theme.tint}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10" />

                <div className="absolute top-2.5 left-2.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wide backdrop-blur-sm ${
                      theme.status === "FREE"
                        ? "bg-emerald-500/20 border-emerald-300/40 text-emerald-200"
                        : "bg-black/60 border-white/25 text-white"
                    }`}
                  >
                    {theme.isLocked && <Lock className="w-3 h-3" />}
                    {theme.status}
                  </span>
                </div>

                {selected && (
                  <div className="absolute top-2.5 right-2.5 rounded-full bg-primary/95 p-1.5 shadow-[0_0_18px_rgba(168,85,247,0.7)]">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                <div className="absolute left-3 right-3 bottom-3">
                  <h3 className="text-[12px] sm:text-sm font-black tracking-wide text-white leading-tight drop-shadow-md">
                    {theme.name}
                  </h3>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-white/10 z-[60] max-w-[480px] mx-auto">
        <Button
          variant="primary"
          onClick={handleNext}
          className="w-full py-3.5 text-base font-extrabold tracking-wide shadow-lg shadow-primary/30"
        >
          <Sparkles className="w-5 h-5" />
          GENERATE MY DESIGN
        </Button>
      </div>
    </ScreenContainer>
  );
};
