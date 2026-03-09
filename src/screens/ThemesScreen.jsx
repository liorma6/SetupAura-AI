import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
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

  const [localSelection, setLocalSelection] = useState(null); // מתחיל ריק כדי להכריח בחירה

  const normalizedThemes = useMemo(
    () =>
      themes.map((theme) => ({
        ...theme,
        isLocked: theme.status === "PREMIUM" ? !isPremium : false,
      })),
    [isPremium],
  );

  const handleNext = (themeId = localSelection) => {
    if (!themeId) return;

    // בדיקה אם התימה שנבחרה נעולה (ליתר ביטחון)
    const selectedThemeObj = themes.find((t) => t.id === themeId);
    const isLocked = selectedThemeObj?.status === "PREMIUM" && !isPremium;
    if (isLocked) return;

    if (verifiedEmail && Number(tokensRemaining || 0) <= 0) {
      setScreen("pricing");
      return;
    }

    setSelectedTheme(themeId);
    setScreen("recommendations");
  };

  return (
    <ScreenContainer>
      <div className="flex-1 overflow-y-auto pb-32 px-1">
        <header className="mb-8 mt-2">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold mb-3 tracking-widest uppercase">
            Step 2 of 3
          </div>
          <h2 className="text-2xl font-display font-black tracking-tight text-white uppercase italic italic">
            Pick Your Style
          </h2>
          <p className="text-gray-400 text-sm mt-1 font-medium">
            Select a theme to start. Premium themes require an upgrade.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-4">
          {normalizedThemes.map((theme) => {
            const isSelected = localSelection === theme.id;

            return (
              <motion.button
                key={theme.id}
                onClick={() =>
                  theme.isLocked ? setScreen("pricing") : setLocalSelection(theme.id)
                }
                onDoubleClick={() =>
                  theme.isLocked ? setScreen("pricing") : handleNext(theme.id)
                }
                whileHover={!theme.isLocked ? { scale: 1.02 } : {}}
                whileTap={!theme.isLocked ? { scale: 0.97 } : {}}
                className={`group relative aspect-[4/5] overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                  isSelected
                    ? "border-primary shadow-[0_0_25px_rgba(168,85,247,0.4)] z-10 scale-[1.03]"
                    : "border-white/5 hover:border-white/20"
                } ${theme.isLocked ? "opacity-60 grayscale-[0.5]" : "cursor-pointer"}`}
              >
                <img
                  src={theme.image}
                  alt={theme.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />

                {/* Overlay layers */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${theme.tint}`}
                />
                <div
                  className={`absolute inset-0 bg-black/40 transition-opacity ${isSelected ? "opacity-20" : "opacity-60"}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20" />

                {/* Status Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[9px] font-black tracking-tighter backdrop-blur-md ${
                      theme.status === "FREE"
                        ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                        : "bg-white/10 border-white/10 text-white"
                    }`}
                  >
                    {theme.isLocked && <Lock className="w-2.5 h-2.5" />}
                    {theme.status}
                  </span>
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3 rounded-full bg-primary p-1.5 shadow-lg"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </motion.div>
                )}

                <div className="absolute left-4 right-4 bottom-4">
                  <h3
                    className={`text-[13px] font-black tracking-tight text-white uppercase leading-tight transition-all ${isSelected ? "scale-105" : ""}`}
                  >
                    {theme.name}
                  </h3>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black via-black/95 to-transparent backdrop-blur-md z-[60] max-w-[480px] mx-auto">
        <Button
          variant="primary"
          onClick={() => handleNext()}
          disabled={!localSelection}
          className={`w-full py-4 text-base font-black tracking-widest uppercase transition-all duration-500 shadow-2xl ${
            localSelection
              ? "opacity-100 scale-100 shadow-primary/40"
              : "opacity-30 grayscale scale-[0.98] pointer-events-none border-white/5"
          }`}
        >
          {localSelection ? "Generate My Design" : "Select a Theme"}
          <ArrowRight
            className={`w-5 h-5 ml-2 transition-transform duration-300 ${localSelection ? "translate-x-1" : ""}`}
          />
        </Button>
      </div>
    </ScreenContainer>
  );
};
