import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ErrorBoundary from '../components/ErrorBoundary';
import SignUpChoiceModal from '../components/SignUpChoiceModal';
import LoginModal from '../components/LoginModal';
import NeuraPlayAssistantLite from '../components/NeuraPlayAssistantLite';
import AIAssistantSmall from '../components/AIAssistantSmall';

const MainLayout: React.FC = () => {
  const [isSignUpModalOpen, setIsSignUpModalOpen] = React.useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = React.useState(false);

  const openSignUpModal = () => setIsSignUpModalOpen(true);
  const closeSignUpModal = () => setIsSignUpModalOpen(false);
  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  const handlePremiumSignUp = () => {
    console.log('Premium signup clicked');
    closeSignUpModal();
  };

  const handleRegularSignUp = () => {
    console.log('Regular signup clicked');
    closeSignUpModal();
  };

  return (
    <ErrorBoundary>
      <div className="font-sf min-h-screen flex flex-col">
        {/* Pass openSignUpModal and openLoginModal to Navbar */}
        <Navbar openSignUpModal={openSignUpModal} openLoginModal={openLoginModal} />

        {/* Sign Up Modal */}
        <SignUpChoiceModal
          isOpen={isSignUpModalOpen}
          onClose={closeSignUpModal}
          onPremiumSignUp={handlePremiumSignUp}
          onRegularSignUp={handleRegularSignUp}
        />

        {/* Login Modal */}
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={closeLoginModal}
          onShowRegistration={() => {
            closeLoginModal();
            openSignUpModal();
          }}
        />

        <main className="flex-1">
          <Outlet />
        </main>

        {/* AIAssistantSmall - floating PlasmaBall assistant */}
        <AIAssistantSmall variant="floating" />

        {/* NeuraPlayAssistantLite - mounted globally to listen for events from anywhere */}
        <NeuraPlayAssistantLite />

        <Footer />
      </div>
    </ErrorBoundary>
  );
};

export default MainLayout;
