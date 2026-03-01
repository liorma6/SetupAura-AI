import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext";

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
            className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden border border-white/15 bg-black/50 touch-none select-none"
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
                style={{ left: `${sliderPosition}%`, transform: "translate(-50%, -50%)" }}
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
                    <button
                        onClick={handleAdminLogin}
                        className="absolute -top-8 right-0 text-[11px] tracking-wide text-gray-400 hover:text-white transition-colors"
                    >
                        Admin Login
                    </button>
                    <div className="mb-10">
                        <h1 className="text-5xl sm:text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-4 drop-shadow-[0_0_20px_rgba(191,0,255,0.6)]">
                            SetupAura
                        </h1>
                        <p className="text-gray-300 text-base sm:text-lg uppercase tracking-[0.2em] font-bold">
                            Design Your Dream Room.<br />Transform your space.
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
                <div className="w-full max-w-md mx-auto">
                    <div className="mb-4 text-center">
                        <p className="text-xs font-bold tracking-[0.22em] text-cyan-300 uppercase">Showcase</p>
                        <h2 className="mt-2 text-2xl font-black text-white">Before / After Gaming Room Upgrades</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-5">
                        <BeforeAfterSlider beforeSrc="/before1.jpg" afterSrc="/after1.jpg" />
                        <BeforeAfterSlider beforeSrc="/before2.jpg" afterSrc="/after2.jpg" />
                        <BeforeAfterSlider beforeSrc="/before3.jpg" afterSrc="/after3.jpg" />
                    </div>
                </div>
            </section>
        </div>
    );
};
