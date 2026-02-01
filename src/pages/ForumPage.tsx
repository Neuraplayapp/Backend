import React, { useState, useRef, useLayoutEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { usePost } from '../contexts/PostContext';
import { MessageCircle, ThumbsUp, ThumbsDown, Reply, Send, Plus, Users, Star, TrendingUp, Heart, Share2, Bookmark, MoreHorizontal, Sparkles, Bot, Mail } from 'lucide-react';
// Use the globally loaded GSAP from CDN
declare const gsap: any;
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';


const ForumPage: React.FC = () => {
    const { user } = useUser();
    const { posts, channels, addPost, addReply, votePost, voteReply } = usePost();
    const { isDarkMode } = useTheme();
    const [selectedChannel, setSelectedChannel] = useState('What I Learned Today');
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostContent, setNewPostContent] = useState('');
    const [showNewPostForm, setShowNewPostForm] = useState(false);
    const [expandedPost, setExpandedPost] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});
    const [showAIPrompt, setShowAIPrompt] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const contentRef = useRef<HTMLDivElement>(null);

    // Dynamic background and styling based on theme
    const forumBackground = isDarkMode 
        ? "bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900" 
        : "bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100";
    
    const glassPanelStyle = isDarkMode 
        ? "bg-black/20 border border-white/10 backdrop-blur-md" 
        : "bg-white/80 border border-blue-200/50 backdrop-blur-md shadow-lg";
    
    const brightYellowGradient = "bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500";
    
    // Channel color mapping for light mode
    const channelColors = {
        'What I Learned Today': {
            bg: 'bg-gradient-to-r from-blue-500 to-purple-600',
            text: 'text-white',
            border: 'border-blue-400'
        },
        'Neuroscience Insights': {
            bg: 'bg-gradient-to-r from-green-500 to-emerald-600',
            text: 'text-white',
            border: 'border-green-400'
        },
        'Cognitive Development': {
            bg: 'bg-gradient-to-r from-orange-500 to-red-500',
            text: 'text-white',
            border: 'border-orange-400'
        },
        'Learning Strategies': {
            bg: 'bg-gradient-to-r from-purple-500 to-pink-500',
            text: 'text-white',
            border: 'border-purple-400'
        },
        'Memory Techniques': {
            bg: 'bg-gradient-to-r from-indigo-500 to-blue-500',
            text: 'text-white',
            border: 'border-indigo-400'
        },
        'Brain Training': {
            bg: 'bg-gradient-to-r from-teal-500 to-cyan-500',
            text: 'text-white',
            border: 'border-teal-400'
        }
    };
    
    // AI Assistant prompts for different themes
    const aiPrompts = {
        light: [
            "Help me write a post about my learning breakthrough in a positive, encouraging tone",
            "Suggest a title for my post about cognitive development",
            "Help me formulate a question about neuroscience in a friendly way",
            "Create an engaging introduction for my learning journey post"
        ],
        dark: [
            "Help me craft a deep, thoughtful post about my cognitive insights",
            "Suggest a compelling title for my neuroscience discovery",
            "Help me frame a complex learning question in an accessible way",
            "Create an introspective introduction for my learning breakthrough"
        ]
    };

    const filteredPosts = posts.filter(post => post.channel === selectedChannel);

    useLayoutEffect(() => {
        if (contentRef.current) {
            gsap.fromTo(contentRef.current, 
                { autoAlpha: 0, y: 20 }, 
                { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.1 }
            );
        }
    }, [selectedChannel]);

    const handleSubmitPost = () => {
        if (!newPostTitle.trim() || !newPostContent.trim() || !user) return;
        
        addPost({
            title: newPostTitle,
            content: newPostContent,
            author: user.username,
            authorAvatar: user?.profile?.avatar || '/assets/placeholder.png',
            channel: selectedChannel,
            votes: 0
        });
        
        setNewPostTitle('');
        setNewPostContent('');
        setShowNewPostForm(false);
    };

    const handleSubmitReply = (postId: string) => {
        const content = replyContent[postId];
        if (!content?.trim() || !user) return;
        
        addReply(postId, {
            content: content,
            author: user.username,
            authorAvatar: user?.profile?.avatar || '/assets/placeholder.png',
            votes: 0
        });
        
        setReplyContent(prev => ({ ...prev, [postId]: '' }));
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
        return date.toLocaleDateString();
    };

    // Forum is now accessible to everyone, but posting requires verification

    return (
        <div className={`min-h-screen pt-24 pb-12 relative ${forumBackground}`}>
            
            <div className="container mx-auto px-6">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <h1 className={`text-5xl md:text-6xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Community Forum</h1>
                    <p className={`text-xl ${isDarkMode ? 'text-violet-300' : 'text-blue-600'} mt-2`}>Share breakthroughs, ask for advice, and grow together.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar */}
                    <aside className="lg:w-64 flex-shrink-0">
                        <div className="sticky top-24 space-y-6">
                            {/* User Profile Card - Only show when logged in */}
                            {user && (
                                <div className={`${glassPanelStyle} p-6 rounded-2xl`}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                                            <img 
                                                src={user.profile?.avatar || '/assets/placeholder.png'} 
                                                alt={user.username}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.username}</h3>
                                            <p className={`text-sm ${isDarkMode ? 'text-violet-300' : 'text-blue-600'}`}>{user.profile?.rank || 'Learner'}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <div className="text-center">
                                            <div className="text-purple-600 dark:text-yellow-400 font-bold">{user?.profile?.xp || 0}</div>
                                            <div className={`${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>XP</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-purple-600 dark:text-yellow-400 font-bold">{user?.profile?.stars || 0}</div>
                                            <div className={`${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Stars</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-purple-600 dark:text-yellow-400 font-bold">{posts.filter(p => p.author === (user?.username || '')).length}</div>
                                            <div className={`${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Posts</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Channels */}
                            <div className={`${glassPanelStyle} p-4 rounded-2xl`}>
                                <h3 className={`font-bold text-xl mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    <MessageCircle size={20} className="text-purple-600 dark:text-yellow-400" />
                                    Channels
                                </h3>
                                <div className="space-y-2">
                                    {channels.map(channel => {
                                        const channelColor = channelColors[channel as keyof typeof channelColors];
                                        return (
                                            <button 
                                                key={channel} 
                                                onClick={() => setSelectedChannel(channel)} 
                                                className={`w-full text-left py-3 px-4 rounded-lg font-semibold transition-all ${
                                                    selectedChannel === channel 
                                                        ? isDarkMode
                                                            ? 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-300 border border-purple-400/30'
                                                            : `${channelColor?.bg} ${channelColor?.text} border ${channelColor?.border} shadow-lg`
                                                        : isDarkMode
                                                            ? `hover:bg-white/10 text-slate-300`
                                                            : `hover:bg-gray-50 text-gray-700 border-l-4`
                                                }`}
                                                style={{
                                                    borderLeftColor: selectedChannel !== channel && !isDarkMode ? 
                                                        channel === 'What I Learned Today' ? '#3b82f6' :
                                                        channel === 'Neuroscience Insights' ? '#10b981' :
                                                        channel === 'Cognitive Development' ? '#f97316' :
                                                        channel === 'Learning Strategies' ? '#8b5cf6' :
                                                        channel === 'Memory Techniques' ? '#6366f1' :
                                                        channel === 'Brain Training' ? '#14b8a6' : '#6b7280'
                                                    : undefined
                                                }}
                                            >
                                                {channel}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 space-y-6">
                        {/* New Post Form */}
                        <div className={`${glassPanelStyle} p-6 rounded-2xl`}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Share in <span className="text-purple-600 dark:text-yellow-400">{selectedChannel}</span>
                                </h2>
                                {!user ? (
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                                            ✉️ Please create an account to post
                                        </span>
                                        <Link 
                                            to="/forum-registration"
                                            className="px-4 py-2 rounded-lg font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 transition-all flex items-center gap-2"
                                        >
                                            <Plus size={16} />
                                            Sign Up
                                        </Link>
                                    </div>
                                ) : !user.isVerified ? (
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                                            ✉️ Please verify your email to post
                                        </span>
                                        <button 
                                            onClick={() => {
                                                // Trigger verification flow
                                                alert('Verification email sent! Check your inbox.');
                                            }}
                                            className="px-4 py-2 rounded-lg font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 transition-all flex items-center gap-2"
                                        >
                                            <Mail size={16} />
                                            Verify Email
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowNewPostForm(!showNewPostForm)}
                                        className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                                            showNewPostForm 
                                                ? 'bg-red-500/20 text-red-300 border border-red-400/30' 
                                                : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700'
                                        }`}
                                    >
                                        {showNewPostForm ? 'Cancel' : <Plus size={16} />}
                                        {showNewPostForm ? 'Cancel' : 'New Post'}
                                    </button>
                                )}
                            </div>

                            {showNewPostForm && user?.isVerified && (
                                <div className="space-y-4">
                                    {/* AI Assistant Prompt Section */}
                                    <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-black/30 border border-white/20' : 'bg-blue-50 border border-blue-200'}`}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Bot className="w-5 h-5 text-purple-500" />
                                            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>AI Writing Assistant</span>
                                            <button
                                                onClick={() => setShowAIPrompt(!showAIPrompt)}
                                                className="ml-auto text-sm text-purple-500 hover:text-purple-400"
                                            >
                                                {showAIPrompt ? 'Hide' : 'Show'} Prompts
                                            </button>
                                        </div>
                                        
                                        {showAIPrompt && (
                                            <div className="space-y-2 mb-3">
                                                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    Choose a prompt to help you write your post:
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {aiPrompts[isDarkMode ? 'dark' : 'light'].map((prompt, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => setAiPrompt(prompt)}
                                                            className={`text-left p-3 rounded-lg border transition-all ${
                                                                aiPrompt === prompt
                                                                    ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300'
                                                                    : 'bg-white/50 dark:bg-white/10 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/20'
                                                            }`}
                                                        >
                                                            <div className="flex items-start gap-2">
                                                                <Sparkles className="w-4 h-4 mt-0.5 text-purple-500" />
                                                                <span className="text-sm">{prompt}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {aiPrompt && (
                                            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'}`}>
                                                <div className="flex items-start gap-2">
                                                    <Bot className="w-4 h-4 mt-0.5 text-purple-500" />
                                                    <div className="flex-1">
                                                        <p className={`text-sm font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                                                            Selected Prompt:
                                                        </p>
                                                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                            {aiPrompt}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => setAiPrompt('')}
                                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Post title..."
                                        value={newPostTitle}
                                        onChange={(e) => setNewPostTitle(e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-400/20 ${
                                            isDarkMode 
                                                ? 'bg-white/10 border-white/20 text-white placeholder-slate-400 focus:border-purple-400' 
                                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-400'
                                        }`}
                                    />
                                    <textarea
                                        placeholder="Share your thoughts..."
                                        value={newPostContent}
                                        onChange={(e) => setNewPostContent(e.target.value)}
                                        rows={4}
                                        className={`w-full px-4 py-3 rounded-xl border resize-none focus:ring-2 focus:ring-purple-400/20 ${
                                            isDarkMode 
                                                ? 'bg-white/10 border-white/20 text-white placeholder-slate-400 focus:border-purple-400' 
                                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-400'
                                        }`}
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSubmitPost}
                                            disabled={!newPostTitle.trim() || !newPostContent.trim()}
                                            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                        >
                                            <Send size={16} />
                                            Post
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Posts List */}
                        <div ref={contentRef} className="space-y-6">
                            {filteredPosts.map(post => (
                                <div key={post.id} className={`${glassPanelStyle} p-6 rounded-2xl`}>
                                    {/* Post Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-amber-500">
                                                <img 
                                                    src={post.authorAvatar} 
                                                    alt={post.author}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{post.author}</h3>
                                                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{formatDate(post.createdAt)}</p>
                                            </div>
                                        </div>
                                        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </div>

                                    {/* Post Content */}
                                    <div className="mb-4">
                                                                        <h4 className={`font-bold text-xl mb-3 ${
                                    isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>{post.title}</h4>
                                <p className={`leading-relaxed ${
                                    isDarkMode ? 'text-slate-200' : 'text-gray-800'
                                }`}>{post.content}</p>
                                    </div>

                                    {/* Post Actions */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {/* Vote Buttons */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => votePost(post.id, 1)}
                                                    className="p-2 hover:bg-green-500/20 rounded-lg transition-colors group"
                                                >
                                                    <ThumbsUp size={16} className="group-hover:text-green-400" />
                                                </button>
                                                <span className={`text-sm font-semibold ${
                                                    isDarkMode ? 'text-white' : 'text-gray-900'
                                                }`}>{post.votes}</span>
                                                <button
                                                    onClick={() => votePost(post.id, -1)}
                                                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
                                                >
                                                    <ThumbsDown size={16} className="group-hover:text-red-400" />
                                                </button>
                                            </div>

                                            {/* Reply Button */}
                                            <button
                                                onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                                                className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <Reply size={16} />
                                                <span className="text-sm">{post.replies.length} replies</span>
                                            </button>

                                            {/* Other Actions */}
                                            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                                <Share2 size={16} />
                                            </button>
                                            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                                <Bookmark size={16} />
                                            </button>
                                        </div>

                                        <div className={`flex items-center gap-2 text-sm ${
                                            isDarkMode ? 'text-slate-400' : 'text-gray-600'
                                        }`}>
                                            <TrendingUp size={14} />
                                            <span>Trending</span>
                                        </div>
                                    </div>

                                    {/* Replies Section */}
                                    {expandedPost === post.id && (
                                        <div className="mt-6 pt-6 border-t border-white/10">
                                            {/* Reply Form */}
                                            <div className="mb-4">
                                                <textarea
                                                    placeholder="Write a reply..."
                                                    value={replyContent[post.id] || ''}
                                                    onChange={(e) => setReplyContent(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                    className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-yellow-400/20 resize-none ${
                                                        isDarkMode 
                                                            ? 'bg-white/10 border-white/20 text-white placeholder-slate-400 focus:border-yellow-400' 
                                                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-yellow-500'
                                                    }`}
                                                    rows={3}
                                                />
                                                <div className="flex justify-end mt-2">
                                                    <button
                                                        onClick={() => handleSubmitReply(post.id)}
                                                        disabled={!replyContent[post.id]?.trim()}
                                                        className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                                    >
                                                        <Send size={14} />
                                                        Reply
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Replies List */}
                                            <div className="space-y-4">
                                                {post.replies.map(reply => (
                                                    <div key={reply.id} className="pl-6 border-l-2 border-yellow-400/30">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-amber-500">
                                                                    <img 
                                                                        src={reply.authorAvatar} 
                                                                        alt={reply.author}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <h4 className={`font-semibold ${
                                                                        isDarkMode ? 'text-white' : 'text-gray-900'
                                                                    }`}>{reply.author}</h4>
                                                                    <p className={`text-xs ${
                                                                        isDarkMode ? 'text-slate-400' : 'text-gray-600'
                                                                    }`}>{formatDate(reply.createdAt)}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className={`mb-3 ${
                                                            isDarkMode ? 'text-slate-200' : 'text-gray-800'
                                                        }`}>{reply.content}</p>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => voteReply(post.id, reply.id, 1)}
                                                                    className="p-1 hover:bg-green-500/20 rounded transition-colors"
                                                                >
                                                                    <ThumbsUp size={14} />
                                                                </button>
                                                                <span className={`text-xs font-semibold ${
                                                                    isDarkMode ? 'text-white' : 'text-gray-900'
                                                                }`}>{reply.votes}</span>
                                                                <button
                                                                    onClick={() => voteReply(post.id, reply.id, -1)}
                                                                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                                                >
                                                                    <ThumbsDown size={14} />
                                                                </button>
                                                            </div>
                                                            <button className={`text-xs transition-colors ${
                                                            isDarkMode 
                                                                ? 'text-slate-400 hover:text-white' 
                                                                : 'text-gray-600 hover:text-gray-900'
                                                        }`}>
                                                                Reply
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {filteredPosts.length === 0 && (
                                <div className={`${glassPanelStyle} p-12 rounded-2xl text-center`}>
                                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
                                        <MessageCircle size={32} className="text-black" />
                                    </div>
                                                                <h3 className={`text-xl font-bold mb-2 ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>No posts yet</h3>
                            <p className={`mb-6 ${
                                isDarkMode ? 'text-slate-400' : 'text-gray-600'
                            }`}>Be the first to share something in {selectedChannel}!</p>
                                    <button
                                        onClick={() => setShowNewPostForm(true)}
                                        className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-amber-600 transition-all flex items-center gap-2 mx-auto"
                                    >
                                        <Plus size={16} />
                                        Create First Post
                                    </button>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default ForumPage;