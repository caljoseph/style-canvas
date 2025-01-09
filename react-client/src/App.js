import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

// Lazy load all routes
const Home = React.lazy(() => import('./pages/Home'));
const Cases = React.lazy(() => import('./pages/Cases'));
const Work = React.lazy(() => import('./pages/Work'));
const Models = React.lazy(() => import('./pages/Models'));
const Pricing = React.lazy(() => import('./pages/Pricing'));
const About = React.lazy(() => import('./pages/About'));
const Contact = React.lazy(() => import('./pages/Contact'));
const Registration = React.lazy(() => import('./pages/Registration'));
const Welcome = React.lazy(() => import('./pages/Welcome'));
const TestImage = React.lazy(() => import('./pages/TestImage'));
const ModelTest = React.lazy(() => import('./pages/ModelTest'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const ComingSoon = React.lazy(() => import('./pages/ComingSoon'));



const LoadingSpinner = () => (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
    }}>
        <div id="preloader"></div>
    </div>
);

// Error Boundary Component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('React Error Boundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h2>Something went wrong.</h2>
                    <p>Please try refreshing the page.</p>
                    <pre style={{ color: 'red' }}>{this.state.error?.toString()}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

function App() {
    console.log('App component rendering...');

    return (
        <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Home />} />
                        <Route path="cases" element={<Cases />} />
                        <Route path="work" element={<Work />} />
                        <Route path="models" element={<Models />} />
                        <Route path="coming-soon" element={<ComingSoon />} />
                        <Route path="pricing" element={<Pricing />} />
                        <Route path="about" element={<About />} />
                        <Route path="contact" element={<Contact />} />
                        <Route path="registration" element={<Registration />} />
                        <Route path="welcome" element={<Welcome />} />
                        <Route path="model-test" element={<ModelTest />} />
                        <Route path="forgot-password" element={<ForgotPassword />} />
                        <Route path="reset-password" element={<ResetPassword />} />
                        <Route path="test_image" element={<TestImage />} />
                    </Route>
                </Routes>
            </Suspense>
        </ErrorBoundary>
    );
}

export default App;