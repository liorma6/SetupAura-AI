/* eslint-disable react/prop-types */
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText } from 'lucide-react';

export const TermsModal = ({ isOpen, onClose }) => {
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
                            aria-label="Close terms of use"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4 text-primary">
                            <FileText className="w-8 h-8" />
                            <h3 className="text-xl font-display font-bold text-white">Terms of Use</h3>
                        </div>

                        <div className="space-y-4 text-sm text-gray-400 leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                            <p>
                                By accessing or using SetupAura AI, you agree to be bound by these Terms of Use. Please read them carefully before proceeding.
                            </p>
                            <ul className="list-disc pl-4 space-y-2">
                                <li>
                                    <strong className="text-white">AI-Generated Content:</strong> All room transformation images produced by SetupAura AI are provided strictly "as is". They are artistic interpretations and do not constitute professional interior design advice, product specifications, or guarantees of any real-world outcome.
                                </li>
                                <li>
                                    <strong className="text-white">User Responsibility for Uploads:</strong> You are solely responsible for any images you upload. By uploading an image, you confirm that you hold all necessary rights, licences, and permissions to use and process that image. You must not upload images that infringe the copyright, privacy, or intellectual property rights of any third party.
                                </li>
                                <li>
                                    <strong className="text-white">No Liability for Purchases or Modifications:</strong> SetupAura AI accepts no liability for any furniture purchases, home renovations, room modifications, or associated costs undertaken based on AI-generated suggestions. Any real-world actions you take based on the output of this service are entirely at your own risk and expense.
                                </li>
                                <li>
                                    <strong className="text-white">Service Availability:</strong> We do not guarantee uninterrupted access to the service. SetupAura AI may be modified, suspended, or discontinued at any time without prior notice.
                                </li>
                                <li>
                                    <strong className="text-white">Acceptable Use:</strong> You agree not to use this service for any unlawful purpose, to upload harmful or offensive content, or to attempt to reverse-engineer or disrupt the platform.
                                </li>
                                <li>
                                    <strong className="text-white">Governing Law:</strong> These terms are governed by applicable law. Disputes shall be resolved in the competent courts of the jurisdiction in which SetupAura AI operates.
                                </li>
                            </ul>
                            <p className="text-xs pt-4 border-t border-white/10">
                                Last updated: February 2025. Continued use of the service constitutes acceptance of these terms.
                            </p>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors"
                            >
                                I Understand
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
