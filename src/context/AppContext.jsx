import { createContext, useContext, useEffect, useState } from 'react';

const AppContext = createContext();
const APP_STATE_KEY = 'setupaura_app_state';

const getInitialScreen = () => {
    if (typeof window === 'undefined') return 'welcome';
    const path = window.location.pathname;
    if (path.includes('/result')) return 'result';
    if (path.includes('/pricing')) return 'pricing';
    if (path.includes('/admin')) return 'admin';
    return 'welcome';
};

const getStoredState = () => {
    const fallbackState = {
        uploadedImage: null,
        selectedTheme: null,
        generatedImage: null,
        verifiedEmail: '',
        tokensRemaining: 1,
        isPremium: false,
    };
    if (typeof window === 'undefined') return fallbackState;
    try {
        const raw = sessionStorage.getItem(APP_STATE_KEY);
        if (!raw) return fallbackState;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return fallbackState;
        return {
            uploadedImage: parsed.uploadedImage ?? null,
            selectedTheme: parsed.selectedTheme ?? null,
            generatedImage: parsed.generatedImage ?? null,
            verifiedEmail: typeof parsed.verifiedEmail === 'string' ? parsed.verifiedEmail : '',
            tokensRemaining: typeof parsed.tokensRemaining === 'number' ? parsed.tokensRemaining : fallbackState.tokensRemaining,
            isPremium: typeof parsed.isPremium === 'boolean' ? parsed.isPremium : fallbackState.isPremium,
        };
    } catch {
        return fallbackState;
    }
};

export const AppProvider = ({ children }) => {
    const storedState = getStoredState();
    const [screen, setScreenState] = useState(getInitialScreen);
    const [uploadedImage, setUploadedImageState] = useState(storedState.uploadedImage);
    const [selectedTheme, setSelectedThemeState] = useState(storedState.selectedTheme);
    const [generatedImage, setGeneratedImageState] = useState(storedState.generatedImage);
    const [verifiedEmail, setVerifiedEmailState] = useState(storedState.verifiedEmail);
    const [tokensRemaining, setTokensRemainingState] = useState(storedState.tokensRemaining);
    const [isPremium, setIsPremiumState] = useState(storedState.isPremium);

    useEffect(() => {
        try {
            sessionStorage.setItem(APP_STATE_KEY, JSON.stringify({
                screen,
                uploadedImage,
                selectedTheme,
                generatedImage,
                verifiedEmail,
                tokensRemaining,
                isPremium
            }));
        } catch {}
    }, [screen, uploadedImage, selectedTheme, generatedImage, verifiedEmail, tokensRemaining, isPremium]);

    const setScreen = (screen) => {
        const path = screen === 'pricing'
            ? '/pricing'
            : screen === 'result'
                ? '/result'
                : screen === 'admin'
                    ? '/admin'
                    : '/';
        if (window.location.pathname !== path) {
            window.history.pushState({}, '', path);
        }
        setScreenState(screen);
    };
    const setUploadedImage = (image) => setUploadedImageState(image);
    const setSelectedTheme = (theme) => setSelectedThemeState(theme);
    const setGeneratedImage = (image) => setGeneratedImageState(image);
    const setVerifiedEmail = (email) => setVerifiedEmailState(email);
    const setTokensRemaining = (tokens) =>
        setTokensRemainingState((prev) =>
            Math.max(0, Number.isFinite(tokens) ? Math.floor(tokens) : prev)
        );
    const addTokens = (tokens) =>
        setTokensRemainingState((prev) =>
            Math.max(0, (Number(prev) || 0) + Math.max(0, Number(tokens) || 0))
        );
    const decrementTokens = () =>
        setTokensRemainingState((prev) => Math.max(0, (Number(prev) || 0) - 1));
    const setIsPremium = (nextPremium) => setIsPremiumState(Boolean(nextPremium));

    const resetApp = () => {
        setScreenState('scan');
        setUploadedImageState(null);
        setSelectedThemeState(null);
        setGeneratedImageState(null);
        setVerifiedEmailState('');
        setTokensRemainingState(1);
        setIsPremiumState(false);
        try {
            sessionStorage.setItem(APP_STATE_KEY, JSON.stringify({
                screen: 'scan',
                uploadedImage: null,
                selectedTheme: null,
                generatedImage: null,
                verifiedEmail: '',
                tokensRemaining: 1,
                isPremium: false
            }));
        } catch {}
    };

    return (
        <AppContext.Provider value={{
            screen,
            uploadedImage,
            selectedTheme,
            generatedImage,
            verifiedEmail,
            tokensRemaining,
            isPremium,
            setScreen,
            setUploadedImage,
            setSelectedTheme,
            setGeneratedImage,
            setVerifiedEmail,
            setTokensRemaining,
            addTokens,
            decrementTokens,
            setIsPremium,
            resetApp
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
