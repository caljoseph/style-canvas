// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'aos/dist/aos.css';
import './assets/css/main.css';

console.log('Starting app initialization...');

const root = ReactDOM.createRoot(document.getElementById('root'));
console.log('Root element found:', !!document.getElementById('root'));

const renderApp = () => {
    console.log('Rendering app...');
    root.render(
        <React.StrictMode>
            <AuthProvider>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </AuthProvider>
        </React.StrictMode>
    );
    console.log('App rendered');
};

try {
    renderApp();
} catch (error) {
    console.error('Error rendering app:', error);
}