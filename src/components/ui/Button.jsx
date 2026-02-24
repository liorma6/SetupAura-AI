/* eslint-disable react/prop-types */
import { motion } from "framer-motion";

export const Button = ({ children, onClick, variant = "primary", className = "" }) => {
    const baseStyle = "w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wider transition-all duration-300 relative overflow-hidden font-display";

    const variants = {
        primary: "bg-gradient-to-r from-primary to-secondary text-white shadow-neon-purple hover:shadow-neon-pink border border-transparent hover:scale-[1.02]",
        outline: "bg-transparent border-2 border-primary text-primary shadow-[0_0_10px_rgba(191,0,255,0.3)] hover:bg-primary/10 hover:shadow-neon-purple",
        ghost: "bg-transparent text-gray-400 hover:text-white"
    };

    return (
        <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`${baseStyle} ${variants[variant]} ${className}`}
        >
            <span className="relative z-10 flex items-center justify-center gap-2">
                {children}
            </span>
            {variant === 'primary' && (
                <div className="absolute inset-0 bg-white/20 blur-md opacity-0 hover:opacity-100 transition-opacity duration-300" />
            )}
        </motion.button>
    );
};
