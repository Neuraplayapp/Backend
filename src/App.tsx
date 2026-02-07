import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MainLayout from './layouts/MainLayout';
import ParentHomePage from './pages/ParentHomePage';
import DashboardPage from './pages/DashboardPage';
import AboutUsPage from './pages/AboutUsPage';
import ProfilePage from './pages/ProfilePage';
import MobileShell from "./components/mobile/MobileShell";
import NeuraPlayAssistantLitePage from './pages/NeuraPlayAssistantLitePage';
import CourseGeneratorPage from './pages/CourseGeneratorPage';
import { useUser } from './contexts/UserContext';
import ForumPage from './pages/ForumPage';
import PlaygroundPage from './pages/PlaygroundPage';
import AIReportPage from './pages/AIReportPage';

// Mobile detection hook
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isSmallScreen = window.innerWidth <= 768;
    return isMobileDevice || isSmallScreen;
  });

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      return isMobileDevice || isSmallScreen;
    };
    
    setIsMobile(checkMobile());
    
    const handleResize = () => {
      setIsMobile(checkMobile());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

function App() {
  const { user } = useUser();
  const isMobile = useIsMobile();

  // Mobile layout for signed-in users - automatically show MobileShell
  if (isMobile && user) {
    return (
      <Routes>
        <Route path="/mobile" element={<MobileShell />} />
        <Route path="*" element={<MobileShell />} />
      </Routes>
    );
  }

  // Desktop layout
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<ParentHomePage />} />
        <Route path="/about" element={<AboutUsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/playground" element={<PlaygroundPage/>} />
        <Route path="/forum" element={<ForumPage />} />
        <Route path="/ai-insights" element={<AIReportPage />} />
        <Route path="/features" element={<div className="p-8 text-center">Feature Page - Coming Soon</div>} />
        <Route path="/assistant-lite" element={<NeuraPlayAssistantLitePage />} />
        <Route path="/courses" element={<CourseGeneratorPage />} />
        <Route path="/courses/:courseName" element={<CourseGeneratorPage />} />
      </Route>
      {/* Mobile route - fullscreen, no layout */}
      <Route path="/mobile" element={<MobileShell />} />
    </Routes>
  );
}

export default App;
