/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { motion } from "framer-motion";
import { Wand2, AlertTriangle } from "lucide-react";
import { useApp } from "../context/AppContext";

const InfoItem = ({ label, score, max, colorClass }) => {
    const width = (score / max) * 100 + "%";
    return (
        <div className="mb-4 last:mb-0">
            <div className="flex justify-between text-sm mb-1 font-medium">
                <span className="text-gray-400">{label}</span>
                <span className={colorClass}>{score}/{max}</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: width }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className={`h-full ${colorClass.replace('text-', 'bg-')}`}
                />
            </div>
        </div>
    );
};

export const AnalysisScreen = () => {
    const { analysisResult, setScreen } = useApp();
    const [displayScore, setDisplayScore] = useState(0);

    const result = analysisResult || {
        score: 0,
        verdict: { label: "UNKNOWN", color: "text-gray-500", desc: "No analysis data." },
        breakdown: []
    };

    useEffect(() => {
        const target = result.score;
        const interval = setInterval(() => {
            setDisplayScore(prev => {
                if (prev >= target) { clearInterval(interval); return target; }
                return prev + Math.ceil((target - prev) / 10);
            });
        }, 30);
        return () => clearInterval(interval);
    }, [result.score]);

    const circumference = 2 * Math.PI * 88;
    const offset = circumference - ((result.score / 100) * circumference);

    return (
        <div className="fixed inset-0 w-full h-full bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
            <header className="w-full text-center pt-6 pb-2 shrink-0">
                <h2 className="text-gray-400 uppercase tracking-widest text-xs font-bold">Analysis Complete</h2>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto px-6 gap-6 overflow-hidden">
                <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full rotate-[-90deg]">
                        <circle cx="96" cy="96" r="88" className="stroke-gray-800" strokeWidth="12" fill="none" />
                        <motion.circle
                            cx="96" cy="96" r="88"
                            className={`stroke-current ${result.verdict.color} drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]`}
                            strokeWidth="12"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: offset }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-6xl font-display font-bold text-white">{displayScore}</span>
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Aura Score</span>
                    </div>
                </div>

                <div className="text-center px-4">
                    <h3 className="text-2xl font-bold mb-2 font-display">VERDICT: <span className={`${result.verdict.color} glow-text`}>{result.verdict.label}</span></h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{result.verdict.desc}</p>
                </div>

                <div className="w-full bg-surface/50 rounded-2xl p-6 backdrop-blur-sm border border-white/5 shadow-lg">
                    <h4 className="text-xs uppercase text-gray-500 mb-6 font-bold tracking-wider flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-secondary" />
                        Aura Breakdown
                    </h4>
                    {result.breakdown.map((item, index) => (
                        <InfoItem
                            key={index}
                            label={item.label}
                            score={item.score}
                            max={item.max}
                            colorClass={item.score < 5 ? "text-red-500" : (item.score > 8 ? "text-primary" : "text-yellow-500")}
                        />
                    ))}
                </div>
            </div>

            <div className="w-full max-w-md mx-auto pb-10 pt-4 px-6 shrink-0">
                <Button variant="primary" onClick={() => setScreen('recommendations')} className="w-full shadow-lg shadow-primary/20">
                    <Wand2 className="w-5 h-5" />
                    Fix Your Aura
                </Button>
            </div>
        </div>
    );
};
