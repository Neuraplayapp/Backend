import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Lock, CheckCircle, XCircle, Loader } from 'lucide-react';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDarkMode } = useTheme();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Invalid reset link. Please request a new password reset.');
        setIsVerifying(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-reset-token/${token}`);
        const data = await response.json();

        if (data.success) {
          setTokenValid(true);
          setEmail(data.email);
        } else {
          setError(data.message || 'Invalid or expired reset token');
        }
      } catch (err) {
        setError('Failed to verify reset link. Please try again.');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: password
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
      }`}>
        <div className="text-center">
          <Loader className={`w-12 h-12 animate-spin mx-auto mb-4 ${
            isDarkMode ? 'text-violet-400' : 'text-violet-600'
          }`} />
          <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
      }`}>
        <div className={`max-w-md w-full p-8 rounded-2xl ${
          isDarkMode ? 'bg-gray-800/50 border border-red-500/30' : 'bg-white border border-red-300'
        }`}>
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className={`text-2xl font-bold text-center mb-4 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Invalid Reset Link</h2>
          <p className={`text-center mb-6 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
      }`}>
        <div className={`max-w-md w-full p-8 rounded-2xl ${
          isDarkMode ? 'bg-gray-800/50 border border-green-500/30' : 'bg-white border border-green-300'
        }`}>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className={`text-2xl font-bold text-center mb-4 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Password Reset Successful!</h2>
          <p className={`text-center mb-6 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>Your password has been updated. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDarkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      <div className={`max-w-md w-full p-8 rounded-2xl shadow-2xl ${
        isDarkMode ? 'bg-gray-800/80 backdrop-blur-sm border border-white/10' : 'bg-white border border-gray-200'
      }`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/assets/images/Mascot.png" 
              alt="NeuraPlay Mascot" 
              className="w-20 h-20 object-contain"
            />
          </div>
          <h2 className={`text-3xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Reset Your Password</h2>
          <p className={`${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Enter a new password for <strong>{email}</strong>
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <p className="text-red-500 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Reset Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block font-semibold mb-2 flex items-center gap-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <Lock className="w-5 h-5" />
              New Password
            </label>
            <input
              type="password"
              placeholder="Enter new password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-4 rounded-xl border focus:ring-2 focus:ring-violet-400/20 transition-all ${
                isDarkMode 
                  ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-violet-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-violet-500'
              }`}
              required
              minLength={6}
            />
          </div>

          <div>
            <label className={`block font-semibold mb-2 flex items-center gap-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <Lock className="w-5 h-5" />
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full p-4 rounded-xl border focus:ring-2 focus:ring-violet-400/20 transition-all ${
                isDarkMode 
                  ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-violet-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-violet-500'
              }`}
              required
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
                Resetting Password...
              </span>
            ) : (
              'Reset Password'
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className={`w-full py-3 rounded-xl font-semibold transition-colors ${
              isDarkMode 
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }`}
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;



