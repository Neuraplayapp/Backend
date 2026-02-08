import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brain, Menu, X, MessageSquare, LayoutDashboard, User } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import LanguageSelector from './LanguageSelector';
import SettingsDropdown from './SettingsDropdown';

interface NavbarProps {
  openSignUpModal: () => void;
  openLoginModal?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ openSignUpModal, openLoginModal }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { user } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isLoggedIn = !!user;

  // Base nav links (always visible)
  const baseNavLinks = [
    { label: t('navigation.home') || 'Home', href: '/' },
    { label: t('navigation.about') || 'About', href: '/about' },
    { label: t('navigation.features') || 'Features', href: '/features' },
  ];

  // Links only visible when logged in
  const authNavLinks = [
    { label: t('navigation.dashboard') || 'Learning Central', href: '/dashboard' },
    { label: 'Courses', href: '/courses' },
    { label: 'Mobile', href: '/mobile' },
  ];

  const navLinks = isLoggedIn ? [...baseNavLinks, ...authNavLinks] : baseNavLinks;

  const scrollToSection = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(href);
    }
    setIsMobileMenuOpen(false);
  };

  const openAssistant = () => {
    // Dispatch event to open NeuraPlayAssistantLite in fullscreen
    window.dispatchEvent(new CustomEvent('openNeuraPlayAssistant', {
      detail: {
        sessionId: null, // Start fresh session from navbar
        source: 'navbar'
      }
    }));
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 pt-4">
      <div className="flex justify-center px-4">
        {/* Desktop Navbar */}
        <div
          className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl ${
            isDarkMode
              ? 'bg-purple-900 shadow-purple-500/25 hover:shadow-purple-500/40 border border-purple-400/20'
              : 'bg-white shadow-gray-300/50 hover:shadow-gray-400/60 border border-gray-200/50'
          }`}
        >
          <Link to="/" className="flex items-center gap-2 group px-2">
            <div
              className={`p-1.5 rounded-lg transition-colors duration-200 ${
                isDarkMode ? 'bg-purple-500/30' : 'bg-purple-100'
              }`}
            >
              <Brain className={`w-5 h-5 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`} />
            </div>
            <span className={`text-lg font-bold ${isDarkMode ? 'text-purple-50' : 'text-gray-900'}`}>
              Neuraplay
            </span>
          </Link>

          <div className={`w-px h-6 ${isDarkMode ? 'bg-purple-400/30' : 'bg-gray-300/70'}`}></div>

          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollToSection(link.href)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                isDarkMode
                  ? 'text-purple-200 hover:bg-purple-600/50 hover:text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {link.label}
            </button>
          ))}

          <div className={`w-px h-6 ${isDarkMode ? 'bg-purple-400/30' : 'bg-gray-300/70'}`}></div>

          {/* AI Assistant Button */}
          <button
            onClick={openAssistant}
            className={`p-2 rounded-full transition-all duration-200 ${
              isDarkMode
                ? 'text-purple-300 hover:bg-purple-600/50'
                : 'text-purple-600 hover:bg-purple-100'
            }`}
            title="Open AI Assistant"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <div className={`w-px h-6 ${isDarkMode ? 'bg-purple-400/30' : 'bg-gray-300/70'}`}></div>

          <LanguageSelector />

          <div className={`w-px h-6 ${isDarkMode ? 'bg-purple-400/30' : 'bg-gray-300/70'}`}></div>

          {/* Settings Dropdown */}
          <SettingsDropdown />

          <div className={`w-px h-6 ${isDarkMode ? 'bg-purple-400/30' : 'bg-gray-300/70'}`}></div>

          {/* Auth buttons - show Login/Get Started when not logged in, or user menu when logged in */}
          {!isLoggedIn ? (
            <>
              {openLoginModal && (
                <button
                  onClick={() => {
                    openLoginModal();
                    setIsMobileMenuOpen(false);
                  }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isDarkMode
                      ? 'text-purple-200 hover:bg-purple-600/50 hover:text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {t('navigation.login') || 'Login'}
                </button>
              )}
              <button
                onClick={() => {
                  openSignUpModal();
                  setIsMobileMenuOpen(false);
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-purple-400 to-purple-500 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                }`}
              >
                {t('navigation.get_started') || 'Get Started'}
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/profile')}
              className={`p-2 rounded-full transition-all duration-200 ${
                isDarkMode
                  ? 'text-purple-200 hover:bg-purple-600/50 hover:text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title="Profile"
            >
              <User className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Mobile Navbar */}
        <div
          className={`md:hidden flex items-center justify-between w-full max-w-lg px-3 py-2 rounded-full transition-all duration-300 shadow-lg ${
            isDarkMode
              ? 'bg-purple-900 shadow-purple-500/25 border border-purple-400/20'
              : 'bg-white shadow-gray-300/50 border border-gray-200/50'
          }`}
        >
          <Link to="/" className="flex items-center gap-2 group">
            <div
              className={`p-1.5 rounded-lg transition-colors duration-200 ${
                isDarkMode ? 'bg-purple-500/30 group-hover:bg-purple-500/40' : 'bg-purple-100 group-hover:bg-purple-200'
              }`}
            >
              <Brain className={`w-5 h-5 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`} />
            </div>
            <span className={`text-lg font-bold ${isDarkMode ? 'text-purple-50' : 'text-gray-900'}`}>
              Neuraplay
            </span>
          </Link>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`p-2 rounded-full transition-colors duration-200 ${
              isDarkMode ? 'text-purple-200 hover:bg-purple-500/30' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden flex justify-center px-4 mt-2">
          <div
            className={`w-full max-w-lg rounded-2xl overflow-hidden transition-all duration-300 shadow-lg ${
              isDarkMode
                ? 'bg-purple-900 border border-purple-400/20'
                : 'bg-white border border-gray-200/50'
            }`}
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 ${
                    isDarkMode ? 'text-purple-200 hover:bg-purple-600/40' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {link.label}
                </button>
              ))}

              {/* AI Assistant Button - Mobile */}
              <button
                onClick={openAssistant}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${
                  isDarkMode ? 'text-purple-200 hover:bg-purple-600/40' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                AI Assistant
              </button>

              <div className="px-4 py-2">
                <LanguageSelector />
              </div>

              <div className={`h-px my-2 ${isDarkMode ? 'bg-purple-400/20' : 'bg-gray-200'}`}></div>

              {/* Mobile auth buttons */}
              {!isLoggedIn ? (
                <>
                  {openLoginModal && (
                    <button
                      onClick={() => {
                        openLoginModal();
                        setIsMobileMenuOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 ${
                        isDarkMode ? 'text-purple-200 hover:bg-purple-600/40' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {t('navigation.login') || 'Login'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      openSignUpModal();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-gradient-to-r from-purple-400 to-purple-500 text-white'
                        : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                    }`}
                  >
                    {t('navigation.get_started') || 'Get Started'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    navigate('/profile');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${
                    isDarkMode ? 'text-purple-200 hover:bg-purple-600/40' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <User className="w-4 h-4" />
                  {user?.username || 'Profile'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;