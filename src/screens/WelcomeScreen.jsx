/* eslint-disable react/prop-types */
import { ScreenContainer } from "../components/ui/ScreenContainer";
import { Button } from "../components/ui/Button";
import { Sparkles } from "lucide-react";

export const WelcomeScreen = ({ onStart }) => {
    return (
        <ScreenContainer>
            <div className="flex-1 flex flex-col justify-center items-center text-center h-full min-h-[80vh]">
                <div className="mb-12">
                    <h1 className="text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-4 drop-shadow-[0_0_15px_rgba(191,0,255,0.5)]">
                        SetupAura
                    </h1>
                    <p className="text-gray-400 text-lg uppercase tracking-widest font-bold">
                        Rate My Setup.<br />Discover Your Aura.
                    </p>
                </div>

                <div className="w-full space-y-4">
                    <Button onClick={onStart} variant="primary">
                        <Sparkles className="w-5 h-5" />
                        Analyze My Setup
                    </Button>
                    <p className="text-xs text-gray-500 mt-4 max-w-[200px] mx-auto">
                        Get brutally honest critiques and pro styling tips.
                    </p>
                </div>
            </div>
        </ScreenContainer>
    );
};
