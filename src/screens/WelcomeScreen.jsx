import { Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext";

export const WelcomeScreen = ({ onStart }) => {
    const { setVerifiedEmail } = useApp();

    const handleAdminLogin = () => {
        const input = window.prompt("Enter admin email");
        if (!input) return;
        const email = input.trim().toLowerCase();
        if (email === "liorma6@gmail.com") {
            setVerifiedEmail(email);
            try {
                localStorage.setItem("setupaura_email", email);
            } catch {}
            window.alert("Admin mode enabled");
        } else {
            window.alert("Access denied");
        }
    };

    return (
        <div className="relative w-full h-screen flex flex-col justify-center items-center text-center overflow-hidden">
            <video
                src="/hero-video.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-black/60" />

            <div className="relative z-10 flex flex-col items-center px-8 w-full">
                <button
                    onClick={handleAdminLogin}
                    className="absolute top-6 right-6 text-[11px] tracking-wide text-gray-400 hover:text-white transition-colors"
                >
                    Admin Login
                </button>
                <div className="mb-16">
                    <h1 className="text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-5 drop-shadow-[0_0_20px_rgba(191,0,255,0.6)]">
                        SetupAura
                    </h1>
                    <p className="text-gray-300 text-lg uppercase tracking-[0.2em] font-bold">
                        Design Your Dream Room.<br />Transform your space.
                    </p>
                </div>

                <button
                    onClick={onStart}
                    className="relative group px-10 py-5 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-black text-xl uppercase tracking-widest rounded-full shadow-[0_0_40px_rgba(191,0,255,0.6),0_0_80px_rgba(191,0,255,0.3)] hover:shadow-[0_0_60px_rgba(191,0,255,0.9),0_0_120px_rgba(191,0,255,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 animate-pulse hover:animate-none flex items-center gap-3"
                >
                    <Sparkles className="w-6 h-6" />
                    Start Designing
                </button>

                <p className="text-xs text-gray-500 mt-8 max-w-[220px] mx-auto tracking-wide">
                    Create a room concept tailored to your style.
                </p>
            </div>
        </div>
    );
};
