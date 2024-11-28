import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ScrollTop from './ScrollTop';
import Preloader from './Preloader';
import { usePlugins } from '../hooks/usePlugins';

const Layout = () => {
    const location = useLocation();
    usePlugins();

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