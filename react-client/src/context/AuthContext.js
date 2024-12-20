import React, {createContext, useState, useContext, useEffect, useCallback} from 'react';
import Config from "../config"

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = useCallback(async () => {
        try {
                const response = await fetch(`${Config.apiUrl}/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
            } else {
                logout();
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            logout();
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
            fetchUserProfile();
        } else {
            setLoading(false);
        }
    }, [fetchUserProfile]);


    const login = async (email, password) => {
        const response = await fetch(`${Config.apiUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            await fetchUserProfile();
            return { success: true };
        } else {
            return { success: false, message: data.message };
        }
    };

    const register = async (email, password) => {
        const response = await fetch(`${Config.apiUrl}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // Optionally auto-login after registration
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            await fetchUserProfile();
            return { success: true };
        } else {
            return { success: false, message: data.message };
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
    };

    const forgotPassword = async (email) => {
        try {
            const response = await fetch('/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({email}),
            });

            const data = await response.json();
            return {
                success: response.ok,
                message: data.message,
                data: data
            };
        } catch (error) {
            console.error('Error initiating password reset:', error);
            return {
                success: false,
                message: 'An error occurred while initiating password reset'
            };
        }
    };

    const resetPassword = async (email, code, newPassword) => {
        try {
            const response = await fetch('/auth/confirm-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, code, newPassword }),
            });

            const data = await response.json();
            return {
                success: response.ok,
                message: data.message
            };
        } catch (error) {
            console.error('Error resetting password:', error);
            return {
                success: false,
                message: 'An error occurred while resetting password'
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