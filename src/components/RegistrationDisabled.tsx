import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Shield, Lock, ArrowLeft, LogIn } from 'lucide-react';
import { REGISTRATION_DISABLED_MESSAGE } from '../config/features';

interface RegistrationDisabledProps {
  type?: 'registration' | 'forum' | 'general';
}

const RegistrationDisabled: React.FC<RegistrationDisabledProps> = ({ type = 'general' }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const getTitle = () => {
    switch (type) {
      case 'registration':
        return 'Account Registration Disabled';
      case 'forum':
        return 'Forum Registration Disabled';
      default:
        return 'Registration Temporarily Unavailable';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'registration':
        return 'New account creation is currently disabled for security and maintenance purposes.';
      case 'forum':
        return 'Forum registration is currently disabled while we enhance our security systems.';
      default:
        return 'Registration services are temporarily unavailable.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md mx-auto px-6">
        <div className={`backdrop-blur-xl rounded-2xl p-8 text-center transition-all duration-500 ${
          isDarkMode 
            ? 'bg-black/50 border-2 border-white/30 shadow-[0_8px_16px_-12px_rgba(255,255,255,0.08)]' 
            : 'bg-white/90 border-2 border-black/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)]'
        }`}>
          {/* Security Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className={`relative p-4 rounded-full ${
              isDarkMode ? 'bg-orange-900/30' : 'bg-orange-100'
            }`}>
              <Shield className="w-12 h-12 text-orange-600" />
              <Lock className="w-6 h-6 text-orange-700 absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-1" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-4 text-purple-900 dark:text-white">
            {getTitle()}
          </h1>

          {/* Description */}
          <p className="text-lg mb-6 text-purple-700 dark:text-gray-300">
            {getDescription()}
          </p>

          {/* Security Message */}
          <div className={`rounded-lg p-4 mb-6 border-l-4 ${
            isDarkMode 
              ? 'bg-orange-900/20 border-orange-600 text-orange-200' 
              : 'bg-orange-50 border-orange-400 text-orange-800'
          }`}>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-orange-600 mt-0.5" />
              <p className="text-sm font-medium">
                {REGISTRATION_DISABLED_MESSAGE}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button 
              onClick={() => navigate('/signin')}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold px-6 py-4 rounded-full hover:from-violet-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Sign In to Existing Account
            </button>
            
            <button 
              onClick={() => navigate('/')}
              className="w-full bg-transparent border-2 font-bold px-6 py-4 rounded-full transition-all duration-300 border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Return to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationDisabled;
