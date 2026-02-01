import React, { useState, useRef, useEffect } from 'react';
import { Bell, MessageSquare, AlertCircle, CheckCircle, Clock, Star, User, Zap, Settings, X } from 'lucide-react';

type NotificationType = 'all' | 'messages' | 'alerts' | 'achievements';

interface Notification {
  id: string;
  type: 'message' | 'alert' | 'achievement' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  icon?: React.ReactNode;
}

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationType>('all');
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'achievement',
      title: 'Level Up!',
      message: 'Congratulations! You\'ve reached level 5 in Math Adventure.',
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      read: false,
      priority: 'high',
      icon: <Star className="w-4 h-4 text-yellow-500" />
    },
    {
      id: '2',
      type: 'message',
      title: 'New Message',
      message: 'Your teacher has sent you a new assignment.',
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      read: false,
      priority: 'medium',
      icon: <MessageSquare className="w-4 h-4 text-blue-500" />
    },
    {
      id: '3',
      type: 'alert',
      title: 'Study Reminder',
      message: 'Time for your daily math practice session!',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      read: true,
      priority: 'low',
      icon: <AlertCircle className="w-4 h-4 text-orange-500" />
    },
    {
      id: '4',
      type: 'system',
      title: 'System Update',
      message: 'New features have been added to your learning dashboard.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      read: true,
      priority: 'medium',
      icon: <Zap className="w-4 h-4 text-purple-500" />
    }
  ]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'messages') return notification.type === 'message';
    if (activeTab === 'alerts') return notification.type === 'alert';
    if (activeTab === 'achievements') return notification.type === 'achievement';
    return true;
  });

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-4 border-l-red-500';
      case 'medium': return 'border-l-4 border-l-yellow-500';
      case 'low': return 'border-l-4 border-l-green-500';
      default: return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 text-purple-900 dark:text-white hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-gray-700 rounded-full transition-all"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-current" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-1/2 transform -translate-x-1/2 top-[calc(100%+30px)] w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="flex">
            {/* Side Tabs */}
            <div className="w-20 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`w-full p-3 rounded-lg transition-all ${
                    activeTab === 'all'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="All Notifications"
                >
                  <Bell className="w-5 h-5 mx-auto" />
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`w-full p-3 rounded-lg transition-all ${
                    activeTab === 'messages'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="Messages"
                >
                  <MessageSquare className="w-5 h-5 mx-auto" />
                </button>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`w-full p-3 rounded-lg transition-all ${
                    activeTab === 'alerts'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="Alerts"
                >
                  <AlertCircle className="w-5 h-5 mx-auto" />
                </button>
                <button
                  onClick={() => setActiveTab('achievements')}
                  className={`w-full p-3 rounded-lg transition-all ${
                    activeTab === 'achievements'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="Achievements"
                >
                  <Star className="w-5 h-5 mx-auto" />
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {activeTab === 'all' && 'All Notifications'}
                  {activeTab === 'messages' && 'Messages'}
                  {activeTab === 'alerts' && 'Alerts'}
                  {activeTab === 'achievements' && 'Achievements'}
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg transition-all cursor-pointer ${
                        notification.read
                          ? 'bg-gray-50 dark:bg-gray-700/50'
                          : 'bg-purple-50 dark:bg-purple-900/20'
                      } ${getPriorityColor(notification.priority)}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {notification.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-medium ${
                              notification.read 
                                ? 'text-gray-700 dark:text-gray-300' 
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {notification.title}
                            </h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTimeAgo(notification.timestamp)}
                            </span>
                          </div>
                          <p className={`text-sm mt-1 ${
                            notification.read 
                              ? 'text-gray-600 dark:text-gray-400' 
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>{filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}</span>
                  <button className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">
                    View all
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown; 