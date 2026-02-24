/* eslint-disable react/prop-types */
export const Footer = ({ onOpenPrivacy }) => {
    return (
        <footer className="w-full py-4 text-center">
            <div className="flex justify-center items-center gap-4 text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                <span>© 2024 SetupAura AI</span>
                <span>•</span>
                <button
                    onClick={onOpenPrivacy}
                    className="hover:text-primary transition-colors cursor-pointer"
                >
                    Privacy Policy
                </button>
            </div>
        </footer>
    );
};
