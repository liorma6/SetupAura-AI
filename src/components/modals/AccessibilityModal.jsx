/* eslint-disable react/prop-types */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Accessibility } from 'lucide-react';

export const AccessibilityModal = ({ isOpen, onClose }) => {
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
                            aria-label="Close accessibility statement"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4 text-primary">
                            <Accessibility className="w-8 h-8" />
                            <h3 className="text-xl font-display font-bold text-white">Accessibility</h3>
                        </div>

                        <div className="space-y-4 text-sm text-gray-400 leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                            <p>
                                SetupAura AI is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply relevant accessibility standards.
                            </p>
                            <ul className="list-disc pl-4 space-y-2">
                                <li>
                                    <strong className="text-white">Conformance Status:</strong> We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. These guidelines explain how to make web content more accessible to people with disabilities.
                                </li>
                                <li>
                                    <strong className="text-white">Keyboard Navigation:</strong> All interactive elements, including buttons and form inputs, are accessible via keyboard navigation.
                                </li>
                                <li>
                                    <strong className="text-white">Screen Readers:</strong> We use semantic HTML and ARIA labels to ensure compatibility with screen reader software.
                                </li>
                                <li>
                                    <strong className="text-white">Colour Contrast:</strong> Text and interactive elements meet minimum contrast ratio requirements to support users with visual impairments.
                                </li>
                                <li>
                                    <strong className="text-white">Ongoing Efforts:</strong> We regularly test our interface and are committed to addressing accessibility barriers as they are identified.
                                </li>
                            </ul>
                            <p>
                                If you experience any difficulty accessing content on SetupAura AI, please contact us so we can assist you and improve our service.
                            </p>
                            <p className="text-xs pt-4 border-t border-white/10">
                                This statement was last reviewed in February 2025.
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
