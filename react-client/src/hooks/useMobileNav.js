import { useEffect } from 'react';

export const useMobileNav = () => {
    useEffect(() => {
        // Mobile nav toggle handler
        const mobileNavToggleBtn = document.querySelector('.mobile-nav-toggle');

        const mobileNavToogle = () => {
            document.querySelector('body').classList.toggle('mobile-nav-active');
            mobileNavToggleBtn.classList.toggle('bi-list');
            mobileNavToggleBtn.classList.toggle('bi-x');
        };

        mobileNavToggleBtn?.addEventListener('click', mobileNavToogle);

        // Hide mobile nav on link clicks
        const navLinks = document.querySelectorAll('#navmenu a');
        navLinks.forEach(navmenu => {
            navmenu.addEventListener('click', () => {
                if (document.querySelector('.mobile-nav-active')) {
                    mobileNavToogle();
                }
            });
        });

        // Cleanup
        return () => {
            mobileNavToggleBtn?.removeEventListener('click', mobileNavToogle);
            navLinks.forEach(navmenu => {
                navmenu.removeEventListener('click', () => {
                    if (document.querySelector('.mobile-nav-active')) {
                        mobileNavToogle();
                    }
                });
            });
        };
    }, []);
};