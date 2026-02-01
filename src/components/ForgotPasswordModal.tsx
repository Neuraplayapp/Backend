import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Mail, CheckCircle, Loader, X } from 'lucide-react';
import { api } from '../services/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call stubbed forgot password API
      const data = await api.auth.forgotPassword(email.toLowerCase());

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Failed to send reset email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setSuccess(false);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className={`relative max-w-md w-full p-8 rounded-2xl shadow-2xl ${
        isDarkMode ? 'bg-gray-800/95 border border-white/10' : 'bg-white border border-gray-200'
      }`}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${
            isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          // Success State
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className={`text-2xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Check Your Email</h2>
            <p className={`mb-6 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              If an account exists with <strong>{email}</strong>, you'll receive a password reset link shortly.
            </p>
            <p className={`text-sm mb-6 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              The link will expire in 1 hour. Check your spam folder if you don't see it.
            </p>
            <button
              onClick={handleClose}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all"
            >
              Got it
            </button>
          </div>
        ) : (
          // Form State
          <>
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-4">
                <img 
                  src="/assets/images/Mascot.png" 
                  alt="NeuraPlay Mascot" 
                  className="w-20 h-20 object-contain"
                />
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Forgot Password?</h2>
              <p className={`${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                No worries! Enter your email and we'll send you a reset link.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-red-500 text-sm text-center">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className={`font-semibold mb-2 flex items-center gap-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  <Mail className="w-5 h-5" />
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full p-4 rounded-xl border focus:ring-2 focus:ring-violet-400/20 transition-all ${
                    isDarkMode 
                      ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-violet-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-violet-500'
                  }`}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    Sending Reset Link...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                  isDarkMode 
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
              >
                Cancel
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;



