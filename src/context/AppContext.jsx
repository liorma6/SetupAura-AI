/* eslint-disable react/prop-types */
import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [state, setState] = useState({
        screen: new URLSearchParams(window.location.search).get('view') === 'pricing' ? 'recommendations' : 'welcome',
        uploadedImage: null,
        analysisResult: null,
        selectedTheme: null,
    });

    const setScreen = (screen) => setState(prev => ({ ...prev, screen }));
    const setUploadedImage = (image) => setState(prev => ({ ...prev, uploadedImage: image }));
    const setAnalysisResult = (result) => setState(prev => ({ ...prev, analysisResult: result }));
    const setSelectedTheme = (theme) => setState(prev => ({ ...prev, selectedTheme: theme }));

    const resetApp = () => {
        setState({
            screen: 'scan',
            uploadedImage: null,
            analysisResult: null,
            selectedTheme: null
        });
    };

    return (
        <AppContext.Provider value={{
            ...state,
            setScreen,
            setUploadedImage,
            setAnalysisResult,
            setSelectedTheme,
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
