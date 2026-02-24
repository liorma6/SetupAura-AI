/* eslint-disable react/prop-types */
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck } from 'lucide-react';

export const PrivacyModal = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-surface border border-white/10 rounded-2xl w-full max-w-sm p-6 relative z-10 shadow-2xl"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4 text-primary">
                            <ShieldCheck className="w-8 h-8" />
                            <h3 className="text-xl font-display font-bold text-white">Privacy First</h3>
                        </div>

                        <div className="space-y-4 text-sm text-gray-400 leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                            <p>
                                At SetupAura AI, we take your privacy seriously. Here is how we handle your data:
                            </p>
                            <ul className="list-disc pl-4 space-y-2">
                                <li>
                                    <strong className="text-white">Local Processing:</strong> Your images are primarily processed locally in your browser to generate aesthetic scores.
                                </li>
                                <li>
                                    <strong className="text-white">No Cloud Storage:</strong> We do not permanently store your uploaded photos on our servers without your explicit permission.
                                </li>
                                <li>
                                    <strong className="text-white">Data Usage:</strong> Any analysis data is used solely to provide you with setup recommendations.
                                </li>
                            </ul>
                            <p className="text-xs pt-4 border-t border-white/10">
                                This is a demo application. Terms and conditions apply.
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
