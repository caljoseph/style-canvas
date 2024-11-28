// src/hooks/usePlugins.js
import { useEffect } from 'react';
import AOS from 'aos';
import GLightbox from 'glightbox';
import Swiper from 'swiper';
import Isotope from 'isotope-layout';
import imagesLoaded from 'imagesloaded';
import 'swiper/css';
import 'aos/dist/aos.css';
import 'glightbox/dist/css/glightbox.min.css';

export const usePlugins = () => {
    useEffect(() => {
        // Make AOS available globally
        window.AOS = AOS;

        // Initialize AOS
        AOS.init({
            duration: 600,
            easing: 'ease-in-out',
            once: true,
            mirror: false
        });

        // Initialize GLightbox
        const glightbox = GLightbox({
            selector: '.glightbox'
        });

        // Initialize Swiper
        const swiperElements = document.querySelectorAll('.init-swiper');
        swiperElements.forEach((element) => {
            const configElement = element.querySelector('.swiper-config');
            if (configElement) {
                const config = JSON.parse(configElement.innerHTML.trim());
                new Swiper(element, config);
            }
        });

        // Initialize Isotope
        const isotopeElements = document.querySelectorAll('.isotope-layout');
        isotopeElements.forEach((element) => {
            const layout = element.getAttribute('data-layout') || 'masonry';
            const filter = element.getAttribute('data-default-filter') || '*';
            const sort = element.getAttribute('data-sort') || 'original-order';

            const container = element.querySelector('.isotope-container');
            if (container) {
                imagesLoaded(container, function() {
                    new Isotope(container, {
                        itemSelector: '.isotope-item',
                        layoutMode: layout,
                        filter: filter,
                        sortBy: sort
                    });
                });
            }
        });

        // Refresh AOS on dynamic content changes
        document.addEventListener('lazyloaded', () => {
            AOS.refresh();
        });

        // Cleanup function
        return () => {
            if (glightbox) {
                glightbox.destroy();
            }
        };
    }, []);
};

export default usePlugins;