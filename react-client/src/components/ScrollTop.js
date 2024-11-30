import React, { useState, useEffect } from 'react';

const ScrollTop = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            window.scrollY > 100 ? setIsVisible(true) : setIsVisible(false);
        };

        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = (e) => {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <button
            className={`scroll-top d-flex align-items-center justify-content-center ${isVisible ? 'active' : ''}`}
            onClick={scrollToTop}
        >
            <i className="bi bi-arrow-up-short"></i>
        </button>
    );
};

export default ScrollTop;