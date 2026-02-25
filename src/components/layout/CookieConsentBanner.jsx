import { useEffect, useState } from 'react';

export const CookieConsentBanner = ({ onOpenCookies }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        try {
            if (!localStorage.getItem('cookieConsentAccepted')) {
                setVisible(true);
            }
        } catch {
            setVisible(true);
        }
    }, []);

    const handleAccept = () => {
        try { localStorage.setItem('cookieConsentAccepted', 'true'); } catch { }
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4">
            <div className="max-w-2xl mx-auto bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-2xl">
                <p className="text-xs text-gray-400 leading-relaxed flex-1 text-center sm:text-left">
                    We use cookies to improve your experience and for analytics. By continuing to use this site, you agree to our{' '}
                    <button
                        onClick={onOpenCookies}
                        className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors"
                    >
                        Cookie Policy
                    </button>
                    .
                </p>
                <button
                    onClick={handleAccept}
                    className="shrink-0 px-5 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white text-sm font-bold hover:scale-105 active:scale-95 transition-transform"
                >
                    Accept
                </button>
            </div>
        </div>
    );
};
