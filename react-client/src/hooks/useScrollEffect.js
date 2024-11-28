import { useEffect } from 'react';

export const useScrollEffect = () => {
    useEffect(() => {
        const toggleScrolled = () => {
            const selectBody = document.querySelector('body');
            const selectHeader = document.querySelector('#header');

            if (!selectHeader?.classList.contains('scroll-up-sticky') &&
                !selectHeader?.classList.contains('sticky-top') &&
                !selectHeader?.classList.contains('fixed-top')) return;

            if (window.scrollY > 100) {
                selectBody?.classList.add('scrolled');
            } else {
                selectBody?.classList.remove('scrolled');
            }
        };

        window.addEventListener('scroll', toggleScrolled);
        window.addEventListener('load', toggleScrolled);

        return () => {
            window.removeEventListener('scroll', toggleScrolled);
            window.removeEventListener('load', toggleScrolled);
        };
    }, []);
};
