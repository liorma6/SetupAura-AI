import { useState, useEffect } from 'react';

export const SmartImage = ({ src, fallbackSrc, alt, className, ...props }) => {
    // State to hold what we are currently showing
    const [displaySrc, setDisplaySrc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        const loadContent = async () => {
            // 1. Validation First
            if (!src) {
                console.warn("SmartImage: Fallback used: URL was empty or null");
                if (isMounted) {
                    setDisplaySrc(fallbackSrc);
                    setIsLoading(false);
                }
                return;
            }

            // 2. Debugging: Log the request intention
            console.log(`SmartImage: Attempting to load: ${src.slice(0, 50)}...`);

            setIsLoading(true);
            setDisplaySrc(null);

            // 3. Timeout Safety
            timeoutId = setTimeout(() => {
                if (isMounted) {
                    console.warn(`SmartImage: Timeout (10000ms) - Switching to fallback`);
                    setDisplaySrc(fallbackSrc);
                    setIsLoading(false);
                }
            }, 10000);

            try {
                // 4. Robust Fetch for Debugging (Check Headers/Status)
                // Note: For data: URIs, fetch works in modern browsers too!
                const res = await fetch(src);

                if (isMounted) {
                    if (res.ok) {
                        // Success!
                        const blob = await res.blob();
                        const objectUrl = URL.createObjectURL(blob);

                        console.log(`SmartImage: Success loading image. Type: ${blob.type}, Size: ${blob.size}`);
                        clearTimeout(timeoutId);
                        setDisplaySrc(objectUrl);
                        setIsLoading(false);
                    } else {
                        // HTTP Error (404, 403, etc)
                        console.warn(`SmartImage: Fetch failed with status: ${res.status} ${res.statusText}`);
                        clearTimeout(timeoutId);
                        setDisplaySrc(fallbackSrc);
                        setIsLoading(false);
                    }
                }
            } catch (error) {
                if (isMounted) {
                    console.error("SmartImage: Network/Fetch Error:", error);
                    clearTimeout(timeoutId);
                    setDisplaySrc(fallbackSrc);
                    setIsLoading(false);
                }
            }
        };

        loadContent();

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [src, fallbackSrc]);

    if (isLoading) {
        return (
            <div
                className={`${className} bg-white/5 animate-pulse flex items-center justify-center`}
                {...props}
            >
                <span className="sr-only">Loading...</span>
            </div>
        );
    }

    return (
        <img
            src={displaySrc || fallbackSrc}
            alt={alt}
            className={className}
            {...props}
        />
    );
};
