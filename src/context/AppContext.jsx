import { createContext, useContext, useEffect, useState } from 'react';

const AppContext = createContext();
const APP_STATE_KEY = 'setupaura_app_state';
const TEST_USER_EMAIL = 'liorma6@gmail.com';

const getInitialState = () => {
    const initialPath = window.location.pathname;
    const queryView = new URLSearchParams(window.location.search).get('view');
    const fallbackScreen = initialPath === '/pricing' || queryView === 'pricing' ? 'pricing' : 'welcome';
    const fallbackState = {
        screen: fallbackScreen,
        uploadedImage: null,
        selectedTheme: null,
        generatedImage: null,
        verifiedEmail: '',
        tokensRemaining: 5,
        isPremium: false,
    };

    try {
        const raw = sessionStorage.getItem(APP_STATE_KEY);
        if (!raw) return fallbackState;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return fallbackState;
        return {
            screen: typeof parsed.screen === 'string' ? parsed.screen : fallbackState.screen,
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
    const [state, setState] = useState(getInitialState);

    useEffect(() => {
        try {
            sessionStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
        } catch {}
    }, [state]);

    const setScreen = (screen) => {
        const path = screen === 'pricing' ? '/pricing' : '/';
        if (window.location.pathname !== path) {
            window.history.pushState({}, '', path);
        }
        setState(prev => ({ ...prev, screen }));
    };
    const setUploadedImage = (image) => setState(prev => ({ ...prev, uploadedImage: image }));
    const setSelectedTheme = (theme) => setState(prev => ({ ...prev, selectedTheme: theme }));
    const setGeneratedImage = (image) => setState(prev => ({ ...prev, generatedImage: image }));
    const setVerifiedEmail = (email) => setState(prev => {
        const normalized = (email || '').trim().toLowerCase();
        if (normalized === TEST_USER_EMAIL) {
            return { ...prev, verifiedEmail: email, tokensRemaining: 10, isPremium: true };
        }
        return { ...prev, verifiedEmail: email };
    });
    const setTokensRemaining = (tokens) => setState(prev => ({
        ...prev,
        tokensRemaining: Math.max(0, Number.isFinite(tokens) ? Math.floor(tokens) : prev.tokensRemaining)
    }));
    const decrementTokens = () => setState(prev => ({
        ...prev,
        tokensRemaining: Math.max(0, (Number(prev.tokensRemaining) || 0) - 1)
    }));
    const setIsPremium = (isPremium) => setState(prev => ({ ...prev, isPremium: Boolean(isPremium) }));

    const resetApp = () => {
        const resetState = {
            screen: 'scan',
            uploadedImage: null,
            selectedTheme: null,
            generatedImage: null,
            verifiedEmail: '',
            tokensRemaining: 5,
            isPremium: false
        };
        setState(resetState);
        try {
            sessionStorage.setItem(APP_STATE_KEY, JSON.stringify(resetState));
        } catch {}
    };

    return (
        <AppContext.Provider value={{
            ...state,
            setScreen,
            setUploadedImage,
            setSelectedTheme,
            setGeneratedImage,
            setVerifiedEmail,
            setTokensRemaining,
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
