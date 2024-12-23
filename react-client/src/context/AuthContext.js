import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authService, userService } from '../api/services';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = useCallback(async () => {
        try {
            console.log('Fetching user profile...');
            const userData = await userService.getProfile();
            console.log('Profile fetched:', userData);
            setUser(userData);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            logout();
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (localStorage.getItem('accessToken')) {
            fetchUserProfile();
        } else {
            setLoading(false);
        }
    }, [fetchUserProfile]);

    const login = async (email, password) => {
        try {
            const data = await authService.login(email, password);
            console.log('Login successful, fetching profile...');
            await fetchUserProfile();
            return { success: true };
        } catch (error) {
            console.error('Login failed:', error);
            return { success: false, message: error.message };
        }
    };
    const register = async (email, password) => {
        try {
            await authService.register(email, password);
            await fetchUserProfile();
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Registration failed'
            };
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const forgotPassword = async (email) => {
        try {
            const data = await authService.forgotPassword(email);
            return {
                success: true,
                message: data.message,
                data: data
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'An error occurred while initiating password reset'
            };
        }
    };

    const resetPassword = async (email, code, newPassword) => {
        try {
            const data = await authService.resetPassword(email, code, newPassword);
            return {
                success: true,
                message: data.message
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'An error occurred while resetting password'
            };
        }
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading,
        refreshProfile: fetchUserProfile,
        forgotPassword,
        resetPassword
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};