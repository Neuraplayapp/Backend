import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import ModalReveal from './ModalReveal';
import ForgotPasswordModal from './ForgotPasswordModal';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  redirectTo?: string;
  onShowRegistration?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  redirectTo = '/dashboard',
  onShowRegistration
}) => {
  const { setUser } = useUser();
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      setUser(null);
      localStorage.removeItem('neuraplay_user');

      const result = await api.auth.login(
        formData.email.toLowerCase(),
        formData.password
      );

      if (result.user) {
        if (!result.user.isVerified) {
          setError('Please verify your email address before logging in.');
          return;
        }

        setUser(result.user);
        onSuccess?.();
        onClose();
      } else {
        setError(result.message || 'Invalid email or password.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    const baseURL = 'http://localhost:3001/api/auth';
  
    switch (provider) {
      case 'google':
        window.location.href = `${baseURL}/google`;
        break;
  
      case 'facebook':
        window.location.href = `${baseURL}/facebook`;
        break;
  
      case 'apple':
        window.location.href = `${baseURL}/apple`;
        break;
  
      default:
        console.error(`Unknown provider: ${provider}`);
    }
  };  

  return (
    <>
      <ModalReveal
        isOpen={isOpen}
        onClose={onClose}
        title=""
        revealType="fade"
        duration={0.4}
        showCloseButton={true}
        modalClassName="!max-w-5xl !max-h-[95vh] !overflow-hidden"
      >
        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 h-full -m-3 sm:-m-4 md:-m-6">
          {/* Left Side - Login Form */}
          <div className={`p-6 lg:p-8 flex flex-col justify-center ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50/50'
            }`}>
            <div className="max-w-md mx-auto w-full">
              {/* Header */}
              <div className="mb-6">
                <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-violet-600' : 'text-violet-500'
                  }`}>
                  Welcome back!
                </h1>
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-black'
                  }`}>
                  Simplify your workflow and boost your productivity with{' '}
                  <span className="font-semibold">Neuraplay</span>. Get started for free.
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Email Input */}
                <div>
                  <input
                    type="email"
                    placeholder="Username"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-5 py-3 rounded-full border transition-all focus:outline-none focus:ring-2 ${isDarkMode
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-violet-500/50'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-violet-500/30'
                      }`}
                    required
                  />
                </div>

                {/* Password Input */}
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full px-5 py-3 rounded-full border transition-all focus:outline-none focus:ring-2 pr-12 ${isDarkMode
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-violet-500/50'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-violet-500/30'
                      }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* Forgot Password */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className={`text-sm hover:underline ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'
                      }`}
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                    <p className="text-red-500 text-sm">{error}</p>
                  </div>
                )}

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoading || !formData.email || !formData.password}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold px-6 py-3 rounded-full hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {isLoading ? 'Signing in...' : 'Login'}
                </button>
              </form>

              {/* Social Login Divider */}
              <div className="my-4 flex items-center">
                <div className={`flex-1 h-px ${isDarkMode ? 'bg-gradient-to-r from-violet-600 to-purple-600' : 'hover:from-violet-700 hover:to-purple-700'}`}></div>
                <span className={`px-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  or continue with
                </span>
                <div className={`flex-1 h-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
              </div>

              {/* Social Login Buttons */}
              <div className="flex justify-center gap-4 mb-4">
                {/* Google */}
                <button
                  onClick={() => handleSocialLogin('google')}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 bg-gradient-to-r 
                ${isDarkMode 
                 ? 'from-violet-600 to-purple-600' 
                : 'from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600'
               }`}
                  aria-label="Sign in with Google"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                </button>

                <button onClick={() => handleSocialLogin('apple')} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 bg-gradient-to-r 
                ${isDarkMode 
                 ? 'from-violet-600 to-purple-600' 
                : 'from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600'
               }`}
               aria-label="Sign in with Apple">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"> 
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  </button>

                {/* Facebook */}
                <button
                  onClick={() => handleSocialLogin('facebook')}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 bg-gradient-to-r 
                    ${isDarkMode 
                      ? 'from-violet-600 to-purple-600' 
                      : 'from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600'
                    }`}
                  aria-label="Sign in with Facebook"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>
              </div>

              {/* Registration Link */}
              <p className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>
                Not a member?{' '}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onShowRegistration?.();
                  }}
                  className="text-violet-600 hover:text-violet-700 font-semibold transition-colors"
                >
                  Register now
                </button>
              </p>
            </div>
          </div>

          {/* Right Side - Illustration */}
          <div className={`hidden lg:flex flex-col items-center justify-center p-8 relative ${isDarkMode ? 'bg-gradient-to-br from-green-900/20 to-teal-900/20' : 'bg-gradient-to-br from-green-50 to-teal-50'
            }`}>
            {/* Mascot Image */}
            <div className="relative w-full max-w-sm mb-6">
              <img
                src="/assets/images/Mascot.png"
                alt="Neuraplay Mascot"
                className="w-full h-auto object-contain drop-shadow-2xl"
              />

              {/* Decorative floating elements */}
              <div className="absolute top-10 left-10 w-12 h-12 rounded-full bg-green-400/20 animate-pulse"></div>
              <div className="absolute bottom-16 right-10 w-10 h-10 rounded-full bg-teal-400/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute top-1/2 left-5 w-8 h-8 rounded-full bg-blue-400/20 animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Bottom Text */}
            <div className="text-center">
              <p className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                Make your work easier and organized
              </p>
              <p className={`text-lg font-bold mt-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'
                }`}>
                with Neuraplay
              </p>
            </div>
          </div>
        </div>
      </ModalReveal>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </>
  );
};

export default LoginModal;