import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ScrollTop from './ScrollTop';
import Preloader from './Preloader';
import { usePlugins } from '../hooks/usePlugins';
import AOS from 'aos';

const Layout = () => {
    const location = useLocation();
    usePlugins();

    // Initialize AOS on mount
    useEffect(() => {
        try {
            AOS.init({
                once: true,
                disable: 'mobile',
                duration: 1000,
            });
            console.log('AOS initialized successfully');
        } catch (error) {
            console.error('Error initializing AOS:', error);
        }
    }, []);

    // Refresh AOS on route change
    useEffect(() => {
        window.scrollTo(0, 0);
        if (window.AOS) {
            window.AOS.refresh();
        }
    }, [location.pathname]);

    return (
        <div className="index-page">
            <Header />
            <main className="main">
                <Outlet />
            </main>
            <Footer />
            <ScrollTop />
            <Preloader />
        </div>
    );
};

export default Layout;