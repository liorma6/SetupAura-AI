/* eslint-disable react/prop-types */
export const Footer = ({ onOpenPrivacy, onOpenAccessibility, onOpenTerms, onOpenCookies }) => {
    return (
        <footer className="w-full py-4 text-center">
            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                <span>© 2025 SetupAura AI</span>
                <span>•</span>
                <button onClick={onOpenPrivacy} className="hover:text-primary transition-colors cursor-pointer">
                    Privacy Policy
                </button>
                <span>•</span>
                <button onClick={onOpenTerms} className="hover:text-primary transition-colors cursor-pointer">
                    Terms of Use
                </button>
                <span>•</span>
                <button onClick={onOpenCookies} className="hover:text-primary transition-colors cursor-pointer">
                    Cookies
                </button>
                <span>•</span>
                <button onClick={onOpenAccessibility} className="hover:text-primary transition-colors cursor-pointer">
                    Accessibility
                </button>
            </div>
        </footer>
    );
};
