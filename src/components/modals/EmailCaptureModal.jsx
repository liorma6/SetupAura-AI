import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Check, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";

export const EmailCaptureModal = ({ isOpen, onClose, theme, products, imageUrl }) => {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState("idle"); // idle, loading, success
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus("loading");

        try {
            // Dynamic API URL handling
            const API_BASE_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:3000'
                : `http://${window.location.hostname}:3000`;

            const response = await fetch(`${API_BASE_URL}/api/save-lead`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, theme, products, imageUrl })
            });

            if (response.ok) {
                setStatus("success");
            } else {
                console.error("Failed to submit email");
                setStatus("idle"); // reset on error or show error state
            }
        } catch (error) {
            console.error("Error submitting email:", error);
            setStatus("idle");
        }
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-sm bg-[#15151a] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Content */}
                        <div className="text-center">
                            {status === "success" ? (
                                <div className="py-8">
                                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                                        <Check className="w-8 h-8 text-green-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Check your Inbox!</h3>
                                    <p className="text-gray-400 text-sm">
                                        Your detailed report and shopping list are on the way.
                                    </p>
                                    <Button variant="outline" className="mt-6 w-full" onClick={onClose}>
                                        Close
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                                        <Lock className="w-6 h-6 text-primary" />
                                    </div>

                                    <h3 className="text-xl font-bold font-display text-white mb-1">
                                        Unlock Full Report
                                    </h3>

                                    <div className="flex items-center justify-center gap-2 mb-4">
                                        <span className="text-gray-500 line-through text-sm">$19.99</span>
                                        <span className="text-white font-bold bg-primary/20 px-2 py-0.5 rounded text-sm border border-primary/20">
                                            $4.99 Today
                                        </span>
                                    </div>

                                    <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 mb-6 text-left">
                                        <p className="text-xs text-secondary-200 leading-relaxed font-medium">
                                            <span className="font-bold text-secondary">Wait!</span> We are in Closed Beta. You can get this report for <span className="font-bold text-white underline">FREE</span> if you help us with feedback.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="space-y-2 text-left">
                                            <label className="text-xs text-gray-400 ml-1">Email Address</label>
                                            <input
                                                type="email"
                                                required
                                                placeholder="enter@email.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 transition-colors"
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            variant="primary"
                                            className="w-full"
                                            disabled={status === "loading"}
                                        >
                                            {status === "loading" ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Sending...
                                                </>
                                            ) : (
                                                "Send My Report"
                                            )}
                                        </Button>
                                    </form>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return mounted ? createPortal(modalContent, document.body) : null;
};
