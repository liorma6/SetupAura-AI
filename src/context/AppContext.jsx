import { createContext, useContext, useEffect, useState } from 'react';

const AppContext = createContext();
const APP_STATE_KEY = 'setupaura_app_state';

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
    const setVerifiedEmail = (email) => setState(prev => ({ ...prev, verifiedEmail: email }));

    const resetApp = () => {
        const resetState = {
            screen: 'scan',
            uploadedImage: null,
            selectedTheme: null,
            generatedImage: null,
            verifiedEmail: ''
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
