import React, { useState, useEffect } from 'react';

const Preloader = () => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const handleLoad = () => setIsLoading(false);

        // Add load event listener
        window.addEventListener('load', handleLoad);

        // Backup timeout in case load event doesn't fire
        const timeoutId = setTimeout(() => {
            setIsLoading(false);
        }, 2000);

        return () => {
            window.removeEventListener('load', handleLoad);
            clearTimeout(timeoutId);
        };
    }, []);

    if (!isLoading) return null;

    return <div id="preloader"></div>;
};

export default Preloader;