import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Users, UserPlus, MessageCircle, Send, Search, MoreVertical, 
  UserMinus, Ban, Shield, X, Check, Clock, Online, Offline,
  Hash, Smile, Paperclip, Phone, Video
} from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

interface FriendsSystemProps {
  className?: string;
}

const FriendsSystem: React.FC<FriendsSystemProps> = ({ className = '' }) => {
  const { user, setUser } = useUser();
  const { 
    isDarkMode, 
    animationsEnabled, 
    reducedMotion, 
    focusIndicators, 
    keyboardNavigation,
    fontSize,
    highContrast 
  } = useTheme();
  
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [blockedUsers] = useState<string[]>(['BlockedUser1']); // Demo blocked users
  const [messages, setMessages] = useState<Message[]>([
    // Demo messages
    {
      id: '1',
      senderId: 'Alex',
      receiverId: user?.username || 'You',
      content: 'Hey! How are you doing?',
      timestamp: new Date(Date.now() - 60000),
      read: true
    },
    {
      id: '2', 
      senderId: user?.username || 'You',
      receiverId: 'Alex',
      content: 'Hi Alex! I\'m doing great, just finished a fun game!',
      timestamp: new Date(Date.now() - 30000),
      read: true
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: reducedMotion ? 'auto' : 'smooth' 
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedFriend]);

  const getOnlineStatus = (friendId: string): 'online' | 'offline' => {
    // Simulate online status
    const onlineFriends = ['Alex', 'Sam'];
    return onlineFriends.includes(friendId) ? 'online' : 'offline';
  };

  const getLastActive = (friendId: string): string => {
    if (getOnlineStatus(friendId) === 'online') return 'Online';
    // Simulate last active times
    const lastActiveTimes = {
      'Jordan': '2 hours ago',
      'Taylor': '1 day ago',
      'Casey': '3 days ago'
    };
    return lastActiveTimes[friendId as keyof typeof lastActiveTimes] || 'Last seen recently';
  };

  const filteredFriends = (user?.friends || []).filter(friend =>
    friend.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!chatMessage.trim() || !selectedFriend) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: user?.username || 'You',
      receiverId: selectedFriend,
      content: chatMessage.trim(),
      timestamp: new Date(),
      read: false
    };
    
    setMessages(prev => [...prev, newMessage]);
    setChatMessage('');
    
    // Simulate friend response after a delay
    setTimeout(() => {
      const responses = [
        'That sounds awesome!',
        'Nice! Tell me more about it.',
        'Cool! I want to try that game too.',
        'Haha, that\'s funny!',
        'Thanks for sharing!',
        'I agree with you!'
      ];
      
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        senderId: selectedFriend,
        receiverId: user?.username || 'You',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
        read: false
      };
      
      setMessages(prev => [...prev, responseMessage]);
    }, 1000 + Math.random() * 2000);
  };

  const handleAddFriend = () => {
    if (!user || !newFriendUsername.trim()) return;
    
    if (user.friends?.includes(newFriendUsername.trim())) {
      alert('This user is already your friend!');
      return;
    }
    
    // Add to sent requests (in real app, this would be an API call)
    const updatedUser = {
      ...user,
      friendRequests: {
        ...user.friendRequests,
        sent: [...(user.friendRequests?.sent || []), newFriendUsername.trim()]
      }
    };
    
    setUser(updatedUser);
    setNewFriendUsername('');
    setShowAddFriend(false);
  };

  const handleRemoveFriend = (friendUsername: string) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      friends: user.friends?.filter(f => f !== friendUsername) || []
    };
    setUser(updatedUser);
    if (selectedFriend === friendUsername) {
      setSelectedFriend(null);
    }
  };

  const handleBlockUser = (friendUsername: string) => {
    if (!user) return;
    // In a real app, this would add to blocked users list and remove from friends
    const updatedUser = {
      ...user,
      friends: user.friends?.filter(f => f !== friendUsername) || []
    };
    setUser(updatedUser);
    if (selectedFriend === friendUsername) {
      setSelectedFriend(null);
    }
    alert(`${friendUsername} has been blocked.`);
  };

  const handleAcceptFriendRequest = (friendUsername: string) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      friends: [...(user.friends || []), friendUsername],
      friendRequests: {
        ...user.friendRequests,
        received: user.friendRequests?.received?.filter(f => f !== friendUsername) || []
      }
    };
    setUser(updatedUser);
  };

  const handleRejectFriendRequest = (friendUsername: string) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      friendRequests: {
        ...user.friendRequests,
        received: user.friendRequests?.received?.filter(f => f !== friendUsername) || []
      }
    };
    setUser(updatedUser);
  };

  const getFriendMessages = (friendId: string): Message[] => {
    return messages.filter(
      msg => 
        (msg.senderId === friendId && msg.receiverId === (user?.username || 'You')) ||
        (msg.senderId === (user?.username || 'You') && msg.receiverId === friendId)
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  return (
    <div className={`flex h-[600px] rounded-xl overflow-hidden ${className}`}>
      {/* Left Panel - Friends Management */}
      <div className={`w-1/3 border-r-2 flex flex-col ${
        isDarkMode 
          ? 'bg-gray-800/50 border-gray-600' 
          : 'bg-white/90 border-gray-300'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b-2 ${
          isDarkMode ? 'border-gray-600' : 'border-gray-300'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Friends
            </h3>
            <button
              onClick={() => setShowAddFriend(!showAddFriend)}
              className={`p-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 rounded-full ${
                animationsEnabled && !reducedMotion ? 'transition-colors' : ''
              } ${focusIndicators ? 'focus:ring-2 focus:ring-purple-500/50 focus:outline-none' : ''}`}
              title="Add Friend"
              aria-label="Add new friend"
              aria-expanded={showAddFriend}
            >
              <UserPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              aria-label="Search friends"
              className={`w-full pl-10 pr-4 py-2 rounded-lg border-2 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:border-purple-500 focus:outline-none ${
                focusIndicators ? 'focus:ring-2 focus:ring-purple-500/50' : ''
              } ${fontSize === 'large' || fontSize === 'extra-large' ? 'text-lg' : ''} ${
                highContrast ? 'border-4' : ''
              }`}
            />
          </div>
        </div>

        {/* Add Friend Form */}
        {showAddFriend && (
          <div className={`p-4 border-b-2 ${
            isDarkMode ? 'bg-purple-900/20 border-gray-600' : 'bg-purple-50 border-gray-300'
          }`}>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFriendUsername}
                onChange={(e) => setNewFriendUsername(e.target.value)}
                placeholder="Username..."
                aria-label="Enter friend's username"
                className={`flex-1 px-3 py-2 rounded-lg border-2 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:border-purple-500 focus:outline-none ${
                  focusIndicators ? 'focus:ring-2 focus:ring-purple-500/50' : ''
                } ${fontSize === 'large' || fontSize === 'extra-large' ? 'text-lg' : ''} ${
                  highContrast ? 'border-4' : ''
                }`}
                onKeyPress={(e) => e.key === 'Enter' && handleAddFriend()}
              />
              <button
                onClick={handleAddFriend}
                disabled={!newFriendUsername.trim()}
                aria-label="Send friend request"
                className={`px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg ${
                  animationsEnabled && !reducedMotion ? 'transition-colors' : ''
                } ${focusIndicators ? 'focus:ring-2 focus:ring-purple-500/50 focus:outline-none' : ''}`}
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto">
          {/* Current Friends */}
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-2">
              Friends ({filteredFriends.length})
            </div>
            {filteredFriends.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No friends found' : 'No friends yet'}
              </div>
            ) : (
              filteredFriends.map(friendId => (
                <div
                  key={friendId}
                  onClick={() => setSelectedFriend(friendId)}
                  onKeyPress={(e) => keyboardNavigation && (e.key === 'Enter' || e.key === ' ') && setSelectedFriend(friendId)}
                  tabIndex={keyboardNavigation ? 0 : -1}
                  role="button"
                  aria-pressed={selectedFriend === friendId}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                    animationsEnabled && !reducedMotion ? 'transition-all' : ''
                  } ${
                    selectedFriend === friendId
                      ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-300 dark:border-purple-600'
                      : isDarkMode
                        ? 'hover:bg-gray-700/50'
                        : 'hover:bg-gray-100'
                  } ${focusIndicators ? 'focus:ring-2 focus:ring-purple-500/50 focus:outline-none' : ''} ${
                    fontSize === 'large' || fontSize === 'extra-large' ? 'text-base' : 'text-sm'
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-300 to-blue-200 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {friendId.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                      getOnlineStatus(friendId) === 'online' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white truncate">
                      {friendId}
                    </div>
                    <div className={`text-xs ${
                      getOnlineStatus(friendId) === 'online'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {getLastActive(friendId)}
                    </div>
                  </div>
                  <div className="relative group">
                    <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <div className={`absolute right-0 top-6 w-32 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 ${
                      isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-300'
                    }`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFriend(friendId);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <UserMinus className="w-3 h-3" />
                        Remove
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBlockUser(friendId);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <Ban className="w-3 h-3" />
                        Block
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Friend Requests */}
          {user?.friendRequests?.received && user.friendRequests.received.length > 0 && (
            <div className="p-2 border-t border-gray-300 dark:border-gray-600">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-2">
                Requests ({user.friendRequests.received.length})
              </div>
              {user.friendRequests.received.map(friendId => (
                <div key={friendId} className="flex items-center gap-3 p-3 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-300 to-blue-200 flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {friendId.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {friendId}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAcceptFriendRequest(friendId)}
                      className="p-1 bg-green-100 hover:bg-green-200 text-green-600 rounded"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleRejectFriendRequest(friendId)}
                      className="p-1 bg-red-100 hover:bg-red-200 text-red-600 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div className={`flex-1 flex flex-col ${
        isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50/90'
      }`}>
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <div className={`p-4 border-b-2 flex items-center justify-between ${
              isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-white/90'
            }`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-300 to-blue-200 flex items-center justify-center">
                    <span className="text-white font-bold">
                      {selectedFriend.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                    getOnlineStatus(selectedFriend) === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {selectedFriend}
                  </div>
                  <div className={`text-xs ${
                    getOnlineStatus(selectedFriend) === 'online'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {getLastActive(selectedFriend)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  className={`p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20 ${
                    animationsEnabled && !reducedMotion ? 'transition-colors' : ''
                  } ${focusIndicators ? 'focus:ring-2 focus:ring-purple-500/50 focus:outline-none' : ''}`}
                  title="Voice call"
                  aria-label={`Call ${selectedFriend}`}
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button 
                  className={`p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20 ${
                    animationsEnabled && !reducedMotion ? 'transition-colors' : ''
                  } ${focusIndicators ? 'focus:ring-2 focus:ring-purple-500/50 focus:outline-none' : ''}`}
                  title="Video call"
                  aria-label={`Video call ${selectedFriend}`}
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {getFriendMessages(selectedFriend).map(message => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.senderId === (user?.username || 'You') ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      message.senderId === (user?.username || 'You')
                        ? 'bg-purple-600 text-white rounded-br-sm'
                        : isDarkMode
                          ? 'bg-gray-700 text-white rounded-bl-sm'
                          : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.senderId === (user?.username || 'You')
                        ? 'text-purple-200'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className={`p-4 border-t-2 ${
              isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-white/90'
            }`}>
              <div className="flex gap-2">
                <button 
                  className={`p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20 ${
                    animationsEnabled && !reducedMotion ? 'transition-colors' : ''
                  } ${focusIndicators ? 'focus:ring-2 focus:ring-purple-500/50 focus:outline-none' : ''}`}
                  title="Attach file"
                  aria-label="Attach file to message"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder={`Message ${selectedFriend}...`}
                  aria-label={`Type message to ${selectedFriend}`}
                  className={`flex-1 px-4 py-2 rounded-xl border-2 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:border-purple-500 focus:outline-none ${
                    focusIndicators ? 'focus:ring-2 focus:ring-purple-500/50' : ''
                  } ${fontSize === 'large' || fontSize === 'extra-large' ? 'text-lg' : ''} ${
                    highContrast ? 'border-4' : ''
                  }`}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button 
                  className={`p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20 ${
                    animationsEnabled && !reducedMotion ? 'transition-colors' : ''
                  } ${focusIndicators ? 'focus:ring-2 focus:ring-purple-500/50 focus:outline-none' : ''}`}
                  title="Add emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim()}
                  className={`px-4 py-2 rounded-xl font-semibold ${
                    animationsEnabled && !reducedMotion ? 'transition-all' : ''
                  } ${
                    chatMessage.trim()
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  } ${focusIndicators ? 'focus:ring-2 focus:ring-purple-500/50 focus:outline-none' : ''} ${
                    highContrast ? 'border-2 border-purple-800' : ''
                  }`}
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Start a Conversation
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Select a friend from the list to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsSystem;