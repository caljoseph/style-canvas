import React, { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMobileNav } from '../hooks/useMobileNav';

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isProfileDropdownVisible, setIsProfileDropdownVisible] = useState(false);
    const dropdownRef = useRef(null);
    const profileRef = useRef(null);

    // Use the mobile nav hook
    useMobileNav();

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click is outside both the profile button and dropdown
            if (
                profileRef.current &&
                dropdownRef.current &&
                !profileRef.current.contains(event.target) &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsProfileDropdownVisible(false);
            }
        };

        // Add event listener when dropdown is visible
        if (isProfileDropdownVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        // Cleanup function to remove event listener
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfileDropdownVisible]); // Only re-run effect when dropdown visibility changes

    const getSubscriptionText = (type) => {
        const types = {
            none: 'not subscribed',
            standard_monthly: 'standard subscription',
            premium_monthly: 'premium subscription',
            pro_monthly: 'pro subscription',
        };
        return types[type] || 'unknown subscription type';
    };

    const toggleProfileDropdown = () => {
        setIsProfileDropdownVisible(!isProfileDropdownVisible);
    };

    const handleLogout = () => {
        logout();
        setIsProfileDropdownVisible(false);
        navigate('/registration');
    };

    const initials = user?.email ?
        user.email.substring(0, 2).toUpperCase() :
        '';

    return (
        <header id="header" className="header d-flex align-items-center sticky-top">
            <div className="container-fluid container-xl position-relative d-flex align-items-center">
                <Link to="/" className="logo d-flex align-items-center me-auto">
                    <img src="/assets/img/main-logo.png" alt="" />
                </Link>

                <nav id="navmenu" className="navmenu">
                    <ul>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/cases">Use Cases</Link></li>
                        <li><Link to="/work">How It Works</Link></li>
                        <li><Link to="/models">AI Models</Link></li>
                        <li><Link to="/coming-soon">Coming Soon</Link></li>
                        <li><Link to="/pricing">Pricing</Link></li>
                        <li><Link to="/about">About</Link></li>
                        <li><Link to="/contact">Contact</Link></li>
                    </ul>
                    <i className="mobile-nav-toggle d-xl-none bi bi-list" />
                </nav>

                {!user ? (
                    <Link to="/registration" className="btn-getstarted" id="get-started-btn">
                        Get Started
                    </Link>
                ) : (
                    <div className="user-profile btn-getstarted btn-dropdown">
                        <div
                            className="profile-pic"
                            onClick={toggleProfileDropdown}
                            ref={profileRef}
                        >
                            {initials}
                        </div>
                        <div
                            className="profile-dropdown"
                            ref={dropdownRef}
                            style={{ display: isProfileDropdownVisible ? 'block' : 'none' }}
                        >
                            <a href="#" id="user-name">
                                {user.name || user.email || 'User'}
                            </a>
                            <Link to="/pricing" className="credits" id="user-credits">
                                {user.tokens || 0} Credits ({getSubscriptionText(user.subscriptionType)})
                                <br />
                                <span>Buy Credits or Manage Subscription</span>
                            </Link>
                            <a href="#" id="logout-btn" onClick={handleLogout}>
                                Logout
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;