/* eslint-disable react/prop-types */
export const Footer = ({ onOpenPrivacy, onOpenAccessibility }) => {
    return (
        <footer className="w-full py-5 text-center border-t border-white/5">
            <p className="text-[11px] text-gray-500 mb-2">© 2026 SetupAura AI</p>
            <div className="flex justify-center items-center gap-5">
                <button
                    onClick={onOpenPrivacy}
                    className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                    Privacy Policy
                </button>
                <button
                    onClick={onOpenAccessibility}
                    className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                    Accessibility
                </button>
            </div>
        </footer>
    );
};