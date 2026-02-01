import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginModal from '../components/LoginModal';
import { ArrowLeft } from 'lucide-react';

const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(true);

  const handleCloseModal = () => {
    setShowLoginModal(false);
    navigate('/');
  };

  const handleLoginSuccess = () => {
    // Login success is handled in the LoginModal component
    // It will redirect to dashboard automatically
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 text-white/70 hover:text-white transition-colors flex items-center gap-2"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Home
      </button>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={handleCloseModal}
        onSuccess={handleLoginSuccess}
        redirectTo="/dashboard"
      />
    </div>
  );
};

export default SignInPage; 