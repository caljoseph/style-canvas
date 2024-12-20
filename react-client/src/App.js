import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Cases from './pages/Cases';
import Work from './pages/Work';
import Models from './pages/Models';
import Pricing from './pages/Pricing';
import About from './pages/About';
import Contact from './pages/Contact';
import Registration from './pages/Registration';
import Welcome from './pages/Welcome';
import TestImage from './pages/TestImage'
import ModelTest from './pages/ModelTest'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from "./pages/ResetPassword";

function App() {
  return (
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="cases" element={<Cases />} />
          <Route path="work" element={<Work />} />
          <Route path="models" element={<Models />} />
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
  );
}

export default App;