import React, { useState, useEffect, useRef } from 'react';
import { 
  UserPlus, 
  MessageCircle, 
  X, 
  Send, 
  Search, 
  MoreVertical, 
  Phone, 
  Video, 
  Mail, 
  Heart,
  Crown,
  Star,
  Shield,
  Settings,
  Trash2,
  Block,
  User,
  Users,
  Plus,
  Check,
  Clock,
  Zap
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';

interface Friend {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: Date;
  isPremium?: boolean;
  level?: number;
  mutualFriends?: number;
  isFavorite?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

interface ChatSession {
  friendId: string;
  messages: Message[];
  unreadCount: number;
}

interface FriendsComponentProps {
  className?: string;
  showChat?: boolean;
  maxHeight?: string;
  onFriendSelect?: (friend: Friend) => void;
  onFriendRemove?: (friendId: string) => void;
  onFriendAdd?: (friendId: string) => void;
}

const FriendsComponent: React.FC<FriendsComponentProps> = ({
  className = '',
  showChat = true,
  maxHeight = 'max-h-96',
  onFriendSelect,
  onFriendRemove,
  onFriendAdd
}) => {
  const { user, setUser } = useUser();
  const { isDarkMode } = useTheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'suggestions'>('friends');
  const [friendRequests, setFriendRequests] = useState<Friend[]>([]);
  const [suggestedFriends, setSuggestedFriends] = useState<Friend[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize demo data
  useEffect(() => {
    const demoFriends: Friend[] = [
      {
        id: '1',
        username: 'Alex',
        status: 'online',
        isPremium: true,
        level: 15,
        mutualFriends: 3,
        isFavorite: true
      },
      {
        id: '2',
        username: 'Sam',
        status: 'away',
        level: 8,
        mutualFriends: 2
      },
      {
        id: '3',
        username: 'Jordan',
        status: 'offline',
        lastSeen: new Date(Date.now() - 3600000),
        level: 12,
        mutualFriends: 5,
        isFavorite: true
      },
      {
        id: '4',
        username: 'Taylor',
        status: 'busy',
        level: 6,
        mutualFriends: 1
      }
    ];

    const demoRequests: Friend[] = [
      {
        id: '5',
        username: 'Casey',
        status: 'online',
        level: 10,
        mutualFriends: 4
      },
      {
        id: '6',
        username: 'Riley',
        status: 'offline',
        level: 7,
        mutualFriends: 2
      }
    ];

    const demoSuggestions: Friend[] = [
      {
        id: '7',
        username: 'Morgan',
        status: 'online',
        level: 9,
        mutualFriends: 3
      },
      {
        id: '8',
        username: 'Quinn',
        status: 'away',
        level: 11,
        mutualFriends: 4
      }
    ];

    setFriends(demoFriends);
    setFriendRequests(demoRequests);
    setSuggestedFriends(demoSuggestions);

    // Initialize chat sessions
    const initialChatSessions: ChatSession[] = demoFriends.map(friend => ({
      friendId: friend.id,
      messages: [
        {
          id: `msg-${friend.id}-1`,
          senderId: friend.id,
          content: `Hey! How's it going?`,
          timestamp: new Date(Date.now() - 3600000),
          isRead: true
        },
        {
          id: `msg-${friend.id}-2`,
          senderId: 'current-user',
          content: 'Great! How about you?',
          timestamp: new Date(Date.now() - 1800000),
          isRead: true
        }
      ],
      unreadCount: Math.floor(Math.random() * 3)
    }));

    setChatSessions(initialChatSessions);
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedFriend]);

  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFriendSelect = (friend: Friend) => {
    setSelectedFriend(friend);
    onFriendSelect?.(friend);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedFriend) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      senderId: 'current-user',
      content: newMessage.trim(),
      timestamp: new Date(),
      isRead: false
    };

    setChatSessions(prev => prev.map(session => 
      session.friendId === selectedFriend.id 
        ? {
            ...session,
            messages: [...session.messages, newMsg],
            unreadCount: 0
          }
        : session
    ));

    setNewMessage('');
  };

  const handleAddFriend = () => {
    if (!newFriendUsername.trim()) return;

    const newFriend: Friend = {
      id: `new-${Date.now()}`,
      username: newFriendUsername.trim(),
      status: 'online',
      level: Math.floor(Math.random() * 20) + 1,
      mutualFriends: Math.floor(Math.random() * 5) + 1
    };

    setFriends(prev => [...prev, newFriend]);
    setNewFriendUsername('');
    setShowAddFriend(false);
    onFriendAdd?.(newFriend.id);
  };

  const handleRemoveFriend = (friendId: string) => {
    setFriends(prev => prev.filter(f => f.id !== friendId));
    setChatSessions(prev => prev.filter(s => s.friendId !== friendId));
    if (selectedFriend?.id === friendId) {
      setSelectedFriend(null);
    }
    onFriendRemove?.(friendId);
  };

  const handleAcceptRequest = (friend: Friend) => {
    setFriendRequests(prev => prev.filter(f => f.id !== friend.id));
    setFriends(prev => [...prev, friend]);
    onFriendAdd?.(friend.id);
  };

  const handleRejectRequest = (friendId: string) => {
    setFriendRequests(prev => prev.filter(f => f.id !== friendId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'busy': return 'Busy';
      default: return 'Offline';
    }
  };

  const currentChatSession = chatSessions.find(s => s.friendId === selectedFriend?.id);

  return (
    <div className={`${className} ${isDarkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-xl border-2 ${
      isDarkMode ? 'border-gray-700' : 'border-gray-200'
    } overflow-hidden`}>
      {/* Header */}
      <div className={`p-6 border-b-2 ${
        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className={`w-6 h-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Friends
            </h2>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              isDarkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700'
            }`}>
              {friends.length}
            </div>
          </div>
          <button
            onClick={() => setShowAddFriend(true)}
            className={`p-2 rounded-full transition-all ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-300 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl border-2 ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:border-purple-500 focus:outline-none transition-colors`}
          />
        </div>
      </div>

      <div className="flex h-96">
        {/* Friends List */}
        <div className="w-1/2 border-r-2 border-gray-200 dark:border-gray-700">
          {/* Tabs */}
          <div className={`flex border-b-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'friends'
                  ? isDarkMode 
                    ? 'text-purple-400 border-b-2 border-purple-400' 
                    : 'text-purple-600 border-b-2 border-purple-600'
                  : isDarkMode 
                    ? 'text-gray-400 hover:text-gray-300' 
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Friends
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'requests'
                  ? isDarkMode 
                    ? 'text-purple-400 border-b-2 border-purple-400' 
                    : 'text-purple-600 border-b-2 border-purple-600'
                  : isDarkMode 
                    ? 'text-gray-400 hover:text-gray-300' 
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Requests
              {friendRequests.length > 0 && (
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  isDarkMode ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'
                }`}>
                  {friendRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'suggestions'
                  ? isDarkMode 
                    ? 'text-purple-400 border-b-2 border-purple-400' 
                    : 'text-purple-600 border-b-2 border-purple-600'
                  : isDarkMode 
                    ? 'text-gray-400 hover:text-gray-300' 
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Suggestions
            </button>
          </div>

          {/* Friends List Content */}
          <div className={`${maxHeight} overflow-y-auto`}>
            {activeTab === 'friends' && (
              <div className="p-4 space-y-2">
                {filteredFriends.map(friend => (
                  <div
                    key={friend.id}
                    onClick={() => handleFriendSelect(friend)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      selectedFriend?.id === friend.id
                        ? isDarkMode 
                          ? 'bg-purple-900/30 border-2 border-purple-500' 
                          : 'bg-purple-50 border-2 border-purple-300'
                        : isDarkMode 
                          ? 'hover:bg-gray-800' 
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center ${
                        friend.isPremium ? 'ring-2 ring-yellow-400' : ''
                      }`}>
                        <User className="w-6 h-6 text-white" />
                        {friend.isPremium && (
                          <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(friend.status)}`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {friend.username}
                        </h3>
                        {friend.isFavorite && (
                          <Heart className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`${getStatusColor(friend.status)} w-2 h-2 rounded-full`}></span>
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {getStatusText(friend.status)}
                        </span>
                        {friend.level && (
                          <>
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>•</span>
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                              Level {friend.level}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {currentChatSession?.unreadCount > 0 && (
                        <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {currentChatSession.unreadCount}
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFriend(friend.id);
                        }}
                        className={`p-1 rounded-full transition-colors ${
                          isDarkMode 
                            ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' 
                            : 'hover:bg-gray-100 text-gray-500 hover:text-red-500'
                        }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="p-4 space-y-2">
                {friendRequests.map(friend => (
                  <div
                    key={friend.id}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                    }`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(friend.status)}`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {friend.username}
                      </h3>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {friend.mutualFriends} mutual friends
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAcceptRequest(friend)}
                        className="p-2 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRejectRequest(friend.id)}
                        className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'suggestions' && (
              <div className="p-4 space-y-2">
                {suggestedFriends.map(friend => (
                  <div
                    key={friend.id}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                    }`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(friend.status)}`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {friend.username}
                      </h3>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {friend.mutualFriends} mutual friends
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddFriend()}
                      className="p-2 rounded-full bg-purple-500 hover:bg-purple-600 text-white transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Section */}
        {showChat && (
          <div className="w-1/2 flex flex-col">
            {selectedFriend ? (
              <>
                {/* Chat Header */}
                <div className={`p-4 border-b-2 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center ${
                          selectedFriend.isPremium ? 'ring-2 ring-yellow-400' : ''
                        }`}>
                          <User className="w-5 h-5 text-white" />
                          {selectedFriend.isPremium && (
                            <Crown className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400" />
                          )}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(selectedFriend.status)}`}></div>
                      </div>
                      <div>
                        <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {selectedFriend.username}
                        </h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {getStatusText(selectedFriend.status)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className={`p-2 rounded-full transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                          : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                      }`}>
                        <Phone className="w-4 h-4" />
                      </button>
                      <button className={`p-2 rounded-full transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                          : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                      }`}>
                        <Video className="w-4 h-4" />
                      </button>
                      <button className={`p-2 rounded-full transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                          : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                      }`}>
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className={`flex-1 p-4 overflow-y-auto ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  <div className="space-y-4">
                    {currentChatSession?.messages.map(message => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderId === 'current-user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs px-4 py-2 rounded-2xl ${
                          message.senderId === 'current-user'
                            ? isDarkMode 
                              ? 'bg-purple-600 text-white' 
                              : 'bg-purple-500 text-white'
                            : isDarkMode 
                              ? 'bg-gray-700 text-white' 
                              : 'bg-white text-gray-900 border border-gray-200'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.senderId === 'current-user'
                              ? 'text-purple-200'
                              : isDarkMode 
                                ? 'text-gray-400' 
                                : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Message Input */}
                <div className={`p-4 border-t-2 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className={`flex-1 px-4 py-2 rounded-xl border-2 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:border-purple-500 focus:outline-none`}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className={`p-2 rounded-xl transition-all ${
                        newMessage.trim()
                          ? isDarkMode 
                            ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                            : 'bg-purple-500 hover:bg-purple-600 text-white'
                          : isDarkMode 
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className={`flex-1 flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="text-center">
                  <MessageCircle className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Select a friend to start chatting
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Choose from your friends list to begin a conversation
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`w-full max-w-md mx-4 rounded-2xl p-6 ${
            isDarkMode 
              ? 'bg-gray-800 border-2 border-gray-700' 
              : 'bg-white border-2 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Add Friend
              </h3>
              <button
                onClick={() => setShowAddFriend(false)}
                className={`p-2 rounded-full transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Username
                </label>
                <input
                  type="text"
                  value={newFriendUsername}
                  onChange={(e) => setNewFriendUsername(e.target.value)}
                  placeholder="Enter username..."
                  className={`w-full px-4 py-2 rounded-xl border-2 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:border-purple-500 focus:outline-none`}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddFriend}
                  disabled={!newFriendUsername.trim()}
                  className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
                    newFriendUsername.trim()
                      ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Add Friend
                </button>
                <button
                  onClick={() => setShowAddFriend(false)}
                  className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsComponent; 