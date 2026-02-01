import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, LogOut } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

const Header: React.FC = () => {
  const { user, setUser } = useUser();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <header className="bg-white sticky top-0 z-50 border-b border-gray-200 shadow-lg">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-3.6xl font-black tracking-tighter flex items-center gap-2 text-purple-900 drop-shadow-lg">
          <Brain className="w-9.6 h-9.6 text-purple-900 drop-shadow-lg" />
          NEURAPLAY
        </Link>
        
        <div className="hidden md:flex items-center space-x-8 font-semibold text-purple-900 text-lg">
          <Link 
            to="/" 
            className={`hover:text-purple-700 transition-colors ${isActive('/') ? 'text-purple-700' : ''}`}
          >
            Home
          </Link>
          <Link 
            to="/playground" 
            className={`hover:text-purple-700 transition-colors ${isActive('/playground') ? 'text-purple-700' : ''}`}
          >
            The Playground
          </Link>
          <Link 
            to="/dashboard" 
            className={`hover:text-purple-700 transition-colors ${isActive('/dashboard') ? 'text-purple-700' : ''}`}
          >
            Learning Central
          </Link>
          <Link 
            to="/forum" 
            className={`hover:text-purple-700 transition-colors ${isActive('/forum') ? 'text-purple-700' : ''}`}
          >
            Forum
          </Link>
          <Link 
            to="/about" 
            className={`hover:text-purple-700 transition-colors ${isActive('/about') ? 'text-purple-700' : ''}`}
          >
            About Us
          </Link>
          <Link 
            to="/test" 
            className={`hover:text-purple-700 transition-colors ${isActive('/test') ? 'text-purple-700' : ''}`}
          >
            Test
          </Link>
          <Link 
            to="/text-reveal" 
            className={`hover:text-purple-700 transition-colors ${isActive('/text-reveal') ? 'text-purple-700' : ''}`}
          >
            Text Reveal
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src={user.profile.avatar} 
                  alt={user.username}
                  className="w-10 h-10 rounded-full border-2 border-violet-200"
                />
                <div className="hidden sm:block">
                  <p className="font-semibold text-purple-900 text-lg">{user.username}</p>
                  <p className="text-sm text-purple-700">{user.profile.rank}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-purple-900 hover:text-red-700 hover:bg-red-50 rounded-full transition-all"
                title="Logout"
              >
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <Link 
              to="/registration" 
              className="bg-gradient-to-r from-purple-500 to-purple-800 text-white font-bold px-6 py-3 rounded-full hover:from-purple-600 hover:to-purple-900 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Begin the Journey
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;