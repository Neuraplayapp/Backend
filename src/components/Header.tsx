import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brain, LogOut, Lock } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { isRegistrationEnabled } from '../config/features';
import SettingsDropdown from './SettingsDropdown';
import NotificationDropdown from './NotificationDropdown';
import GlobalLanguageButton from './GlobalLanguageButton';
import { dataCollectionService } from '../services/DataCollectionService';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const { user, setUser } = useUser();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    setUser(null);
  };

  const handleUserClick = () => {
    if (user) {
      navigate(`/profile`);
    }
  };

  const handleNavigation = (page: string) => {
    // 🗄️ DATABASE INTEGRATION: Log navigation
    dataCollectionService.logNavigation(page, location.pathname).catch(error => {
      console.error('Failed to log navigation to database:', error);
    });
    
    // Existing navigation logic
    navigate(page);
  };


  return (
    <>
      <header id="navigation" className="bg-purple-100 dark:bg-gray-900 sticky top-0 z-40 border-b border-purple-300 dark:border-gray-700 shadow-lg">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-3.6xl font-black tracking-tighter flex items-center gap-2 text-purple-900 dark:text-white drop-shadow-lg">
            <img src="/assets/images/favicon.png" alt="Neuraplay" className="w-8 h-8 drop-shadow-lg" />
            NEURAPLAY
          </Link>
          
          <div className="hidden md:flex items-center space-x-8 font-semibold text-purple-900 dark:text-white text-lg">
            <Link 
              to="/" 
              className={`hover:text-purple-700 dark:hover:text-purple-300 transition-colors ${isActive('/') ? 'text-purple-700 dark:text-purple-300' : ''}`}
            >
              {t('navigation.home')}
            </Link>
            <Link 
              to="/dashboard" 
              className={`hover:text-purple-700 dark:hover:text-purple-300 transition-colors ${isActive('/dashboard') ? 'text-purple-700 dark:text-purple-300' : ''}`}
            >
              {t('navigation.dashboard')}
            </Link>
            {/* Forum navigation - only shown when user is signed in */}
            {user && (
              <Link 
                to="/forum" 
                className={`hover:text-purple-700 dark:hover:text-purple-300 transition-colors ${isActive('/forum') ? 'text-purple-700 dark:text-purple-300' : ''}`}
              >
                {t('navigation.forum')}
              </Link>
            )}
            <Link 
              to="/about" 
              className={`hover:text-purple-700 dark:hover:text-purple-300 transition-colors ${isActive('/about') ? 'text-purple-700 dark:text-purple-300' : ''}`}
            >
              {t('navigation.about')}
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 🌍 Global Language Button - Standard Web Position */}
            <GlobalLanguageButton 
              style="header"
              position="inline"
              showLabel={false}
              className="hidden sm:block"
            />
            {/* Notifications and Settings - only shown when user is logged in */}
            {user && (
              <>
                <NotificationDropdown />
                <SettingsDropdown />
              </>
            )}
            {user ? (
              <div className="flex items-center gap-4">
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:bg-purple-50 dark:hover:bg-gray-700 rounded-lg p-3 transition-all"
                  onClick={handleUserClick}
                >
                  <img 
                    src={user.profile.avatar} 
                    alt={user.username}
                    className="w-10 h-10 rounded-full border-2 border-violet-200 dark:border-gray-600"
                  />
                  <div className="hidden sm:block">
                    <p className="font-semibold text-purple-900 dark:text-white text-lg">{user.username}</p>
                    <p className="text-sm text-purple-700 dark:text-gray-300">{user.profile.rank}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-3 text-purple-900 dark:text-white hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5 text-current" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {isRegistrationEnabled() ? (
                  <Link 
                    to="/registration" 
                    className="bg-gradient-to-r from-purple-500 to-purple-800 text-white font-bold px-6 py-3 rounded-full hover:from-purple-600 hover:to-purple-900 transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    {t('navigation.begin_journey')}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
                    <Lock className="w-4 h-4" />
                    <span className="text-sm font-medium">Registration Disabled</span>
                  </div>
                )}
                <Link 
                  to="/signin" 
                  className="bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold px-6 py-3 rounded-full hover:from-violet-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>
    </>
  );
};

export default Header;
