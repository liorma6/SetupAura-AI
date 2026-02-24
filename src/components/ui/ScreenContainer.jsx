/* eslint-disable react/prop-types */
import { motion } from "framer-motion";

export const ScreenContainer = ({ children, className = "" }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`min-h-screen bg-background text-white p-6 flex flex-col relative ${className}`}
        >
            {/* Background Gradients */}
            <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none fixed" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[50%] bg-secondary/20 blur-[120px] rounded-full pointer-events-none fixed" />

            <div className="relative z-10 flex-1 flex flex-col">
                {children}
            </div>
        </motion.div>
    );
};
