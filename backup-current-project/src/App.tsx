import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useUser } from './contexts/UserContext';
import { AIAgentProvider } from './contexts/AIAgentContext';

// Import your page components
import HomePage from './pages/HomePage';
import PlaygroundPage from './pages/PlaygroundPage';
import ForumPage from './pages/ForumPage';
import ForumRegistrationPage from './pages/ForumRegistrationPage';
import RegistrationPage from './pages/RegistrationPage';
import AIReportPage from './pages/AIReportPage';
import AboutUsPage from './pages/AboutUsPage';
import DashboardPage from './pages/DashboardPage';
import CountingTestPage from './pages/CountingTestPage';
import TestPage from './pages/TestPage';
import EnhancedTextRevealExample from './components/EnhancedTextRevealExample';
// ... other page imports

// Import the AI Assistant and Header
import AIAssistant from './components/AIAssistant';
import Header from './components/Header';



function App() {
  const { user } = useUser();
  const location = useLocation();

  return (
    <AIAgentProvider>

      
      {/* Navigation Header */}
      <Header />

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/forum-registration" element={<ForumRegistrationPage />} />
          <Route path="/registration" element={<RegistrationPage />} />
          <Route path="/ai-report" element={<AIReportPage />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/counting-test" element={<CountingTestPage />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/text-reveal" element={<EnhancedTextRevealExample />} />
          {/* ... etc */}
        </Routes>
      </main>



      {/* The AI Assistant is a global component, visible to anyone who is signed in */}
      {user && <AIAssistant />}
      

      
      {/* AI Agent is now working properly - debug button removed */}
    </AIAgentProvider>
  );
}

export default App;