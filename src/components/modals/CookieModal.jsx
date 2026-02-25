/* eslint-disable react/prop-types */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cookie } from 'lucide-react';

export const CookieModal = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-surface border border-white/10 rounded-2xl w-full max-w-sm p-6 relative z-10 shadow-2xl"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                            aria-label="Close cookie policy"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4 text-primary">
                            <Cookie className="w-8 h-8" />
                            <h3 className="text-xl font-display font-bold text-white">Cookie Policy</h3>
                        </div>

                        <div className="space-y-4 text-sm text-gray-400 leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                            <p>
                                SetupAura AI uses cookies and similar tracking technologies to operate the website, understand usage patterns, and deliver relevant advertising. By continuing to use this site, you consent to our use of cookies as described below.
                            </p>
                            <ul className="list-disc pl-4 space-y-2">
                                <li>
                                    <strong className="text-white">Essential Cookies:</strong> Required for the website to function correctly. These cannot be disabled as they are necessary to deliver the core service.
                                </li>
                                <li>
                                    <strong className="text-white">Analytics Cookies — Google Analytics:</strong> We use Google Analytics to collect anonymised data about how visitors interact with our site (pages visited, session duration, device type). This data helps us improve the user experience. Google may process this data in accordance with their privacy policy.
                                </li>
                                <li>
                                    <strong className="text-white">Advertising Cookies — Meta Pixel:</strong> We use the Meta (Facebook) Pixel to measure the effectiveness of our advertising campaigns and to serve targeted advertisements on Meta platforms to users who have visited SetupAura AI. Meta may process this data in accordance with their data policy.
                                </li>
                                <li>
                                    <strong className="text-white">Retargeting:</strong> Cookies placed by advertising networks may be used to show you SetupAura AI advertisements on third-party websites based on your prior visits to our site.
                                </li>
                                <li>
                                    <strong className="text-white">Managing Cookies:</strong> You can control and delete cookies through your browser settings at any time. Disabling certain cookies may affect the functionality of the site.
                                </li>
                            </ul>
                            <p className="text-xs pt-4 border-t border-white/10">
                                Last updated: February 2025. For further information, contact us directly.
                            </p>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors"
                            >
                                Got it
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
