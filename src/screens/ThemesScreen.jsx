/* eslint-disable react/prop-types */
import { useState } from "react";
import { ScreenContainer } from "../components/ui/ScreenContainer";
import { Button } from "../components/ui/Button";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext";

const themes = [
    { id: 'Modern Gaming (RGB)', name: 'Modern Gaming (RGB)', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', color: 'from-purple-500 to-blue-500' },
    { id: 'Minimalist Setup', name: 'Minimalist Setup', image: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=400&q=80', color: 'from-gray-300 to-white' },
    { id: 'Cozy/Warm Aesthetic', name: 'Cozy/Warm Aesthetic', image: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=400&q=80', color: 'from-orange-400 to-yellow-600' },
    { id: 'Luxury Office', name: 'Luxury Office', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80', color: 'from-yellow-600 to-amber-800' },
];

export const ThemesScreen = () => {
    const { setSelectedTheme, setScreen } = useApp();
    const [localSelection, setLocalSelection] = useState('Modern Gaming (RGB)');


    const handleNext = () => {
        // Facebook Pixel Tracking: Report a "Lead" event when the user generates advice
        if (window.fbq) {
            window.fbq('track', 'Lead');
        }

        setSelectedTheme(localSelection);
        setScreen('recommendations');
    };

    return (
        <ScreenContainer>
            <div className="flex-1 overflow-y-auto pb-24">
                <header className="mb-6">
                    <h2 className="text-xl font-display font-bold">Choose your Vibe</h2>
                    <p className="text-gray-400 text-sm">Define the aesthetic you want to achieve.</p>
                </header>

                <div className="grid grid-cols-2 gap-4 relative z-0">
                    {themes.map((theme) => (
                        <motion.div
                            key={theme.id}
                            onClick={() => setLocalSelection(theme.id)}
                            className={`relative rounded-xl overflow-hidden aspect-[3/4] cursor-pointer group border-2 transition-all duration-300 ${localSelection === theme.id ? 'border-primary shadow-neon-purple scale-[1.02]' : 'border-transparent hover:border-white/20'}`}
                            whileTap={{ scale: 0.98 }}
                        >
                            <img src={theme.image} alt={theme.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                            <div className="absolute bottom-0 left-0 p-3 w-full">
                                <span className={`block w-8 h-1 mb-2 rounded-full bg-gradient-to-r ${theme.color}`} />
                                <h3 className="font-bold text-sm tracking-wide">{theme.name}</h3>
                            </div>

                            {localSelection === theme.id && (
                                <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1 shadow-lg">
                                    <Sparkles className="w-3 h-3" />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-white/10 z-[60] max-w-[480px] mx-auto pointer-events-auto">
                <Button variant="primary" onClick={handleNext} className="w-full shadow-lg shadow-primary/20">
                    <Sparkles className="w-5 h-5" />
                    Generate Advice
                </Button>
            </div>
        </ScreenContainer>
    );
};