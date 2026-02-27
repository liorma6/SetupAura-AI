import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const initialPath = window.location.pathname;
    const queryView = new URLSearchParams(window.location.search).get('view');
    const initialScreen = initialPath === '/pricing' || queryView === 'pricing' ? 'pricing' : 'welcome';
    const [state, setState] = useState({
        screen: initialScreen,
        uploadedImage: null,
        selectedTheme: null,
        generatedImage: null,
        verifiedEmail: '',
    });

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
        setState({
            screen: 'scan',
            uploadedImage: null,
            selectedTheme: null,
            generatedImage: null,
            verifiedEmail: ''
        });
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
