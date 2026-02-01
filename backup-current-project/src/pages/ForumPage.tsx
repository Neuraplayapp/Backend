import React, { useState, useRef, useLayoutEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { usePost } from '../contexts/PostContext';
import { MessageCircle, ThumbsUp, ThumbsDown, Reply, Send, Plus, Users, Star, TrendingUp, Heart, Share2, Bookmark, MoreHorizontal } from 'lucide-react';
// Use the globally loaded GSAP from CDN
declare const gsap: any;
import { Link } from 'react-router-dom';
import PlasmaBackground from '../components/PlasmaBackground';

const ForumPage: React.FC = () => {
    const { user } = useUser();
    const { posts, channels, addPost, addReply, votePost, voteReply } = usePost();
    const [selectedChannel, setSelectedChannel] = useState('What I Learned Today');
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostContent, setNewPostContent] = useState('');
    const [showNewPostForm, setShowNewPostForm] = useState(false);
    const [expandedPost, setExpandedPost] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});
    const contentRef = useRef<HTMLDivElement>(null);

    const glassPanelStyle = "bg-black/20 border border-white/10 backdrop-blur-md";
    const brightYellowGradient = "bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500";

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
            authorAvatar: user.profile?.avatar || '/assets/placeholder.png',
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
            authorAvatar: user.profile?.avatar || '/assets/placeholder.png',
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

    if (!user) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="flex items-center justify-center mb-8">
              <img 
                src="/assets/images/Mascot.png" 
                alt="NeuraPlay Mascot" 
                className="w-32 h-32 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold mb-4">Welcome to NeuraPlay!</h1>
            <p className="text-lg text-gray-300 mb-8">
              Please log in to join the community forum and share your learning journey.
            </p>
            <div className="space-y-4">
              <Link 
                to="/forum-registration" 
                className="inline-block w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold px-8 py-4 rounded-full hover:from-violet-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Create Account
              </Link>
              <Link 
                to="/login" 
                className="inline-block w-full bg-transparent border-2 border-white/20 text-white font-bold px-8 py-4 rounded-full hover:bg-white/10 transition-all duration-300"
              >
                Log In
              </Link>
            </div>
            <p className="text-sm text-gray-400 mt-6">
              Join thousands of learners discovering the joy of cognitive development!
            </p>
          </div>
        </div>
      );
    }

    return (
        <div className="min-h-screen text-slate-200 pt-24 pb-12 relative">
            {/* Plasma Background */}
            <PlasmaBackground />
            
            {/* Light Blue Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-cyan-400/15 to-blue-500/25 pointer-events-none"></div>
            
            <div className="container mx-auto px-6">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white">Community Forum</h1>
                    <p className="text-xl text-violet-300 mt-2">Share breakthroughs, ask for advice, and grow together.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar */}
                    <aside className="lg:w-64 flex-shrink-0">
                        <div className="sticky top-24 space-y-6">
                            {/* User Profile Card */}
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
                                        <h3 className="font-bold text-white">{user.username}</h3>
                                        <p className="text-sm text-violet-300">{user.profile?.rank || 'Learner'}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <div className="text-center">
                                        <div className="text-yellow-400 font-bold">{user.profile?.xp || 0}</div>
                                        <div className="text-slate-400">XP</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-yellow-400 font-bold">{user.profile?.stars || 0}</div>
                                        <div className="text-slate-400">Stars</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-yellow-400 font-bold">{posts.filter(p => p.author === user.username).length}</div>
                                        <div className="text-slate-400">Posts</div>
                                    </div>
                                </div>
                            </div>

                            {/* Channels */}
                            <div className={`${glassPanelStyle} p-4 rounded-2xl`}>
                                <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                                    <MessageCircle size={20} className="text-yellow-400" />
                                    Channels
                                </h3>
                                <div className="space-y-2">
                                    {channels.map(channel => (
                                        <button 
                                            key={channel} 
                                            onClick={() => setSelectedChannel(channel)} 
                                            className={`w-full text-left py-3 px-4 rounded-lg font-semibold transition-all ${
                                                selectedChannel === channel 
                                                    ? 'bg-gradient-to-r from-yellow-400/20 to-amber-500/20 text-yellow-300 border border-yellow-400/30' 
                                                    : 'hover:bg-white/10 text-slate-300'
                                            }`}
                                        >
                                            {channel}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 space-y-6">
                        {/* New Post Form */}
                        <div className={`${glassPanelStyle} p-6 rounded-2xl`}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold text-white">
                                    Share in <span className="text-yellow-400">{selectedChannel}</span>
                                </h2>
                                <button
                                    onClick={() => setShowNewPostForm(!showNewPostForm)}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                                        showNewPostForm 
                                            ? 'bg-red-500/20 text-red-300 border border-red-400/30' 
                                            : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black hover:from-yellow-500 hover:to-amber-600'
                                    }`}
                                >
                                    {showNewPostForm ? 'Cancel' : <Plus size={16} />}
                                    {showNewPostForm ? 'Cancel' : 'New Post'}
                                </button>
                            </div>

                            {showNewPostForm && (
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Post title..."
                                        value={newPostTitle}
                                        onChange={(e) => setNewPostTitle(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                                    />
                                    <textarea
                                        placeholder="Share your thoughts..."
                                        value={newPostContent}
                                        onChange={(e) => setNewPostContent(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 resize-none"
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSubmitPost}
                                            disabled={!newPostTitle.trim() || !newPostContent.trim()}
                                            className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
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
                                                <h3 className="font-bold text-white">{post.author}</h3>
                                                <p className="text-sm text-slate-400">{formatDate(post.createdAt)}</p>
                                            </div>
                                        </div>
                                        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </div>

                                    {/* Post Content */}
                                    <div className="mb-4">
                                        <h4 className="font-bold text-xl text-white mb-3">{post.title}</h4>
                                        <p className="text-slate-200 leading-relaxed">{post.content}</p>
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
                                                <span className="text-sm font-semibold text-white">{post.votes}</span>
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

                                        <div className="flex items-center gap-2 text-sm text-slate-400">
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
                                                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 resize-none"
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
                                                                    <h4 className="font-semibold text-white">{reply.author}</h4>
                                                                    <p className="text-xs text-slate-400">{formatDate(reply.createdAt)}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="text-slate-200 mb-3">{reply.content}</p>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => voteReply(post.id, reply.id, 1)}
                                                                    className="p-1 hover:bg-green-500/20 rounded transition-colors"
                                                                >
                                                                    <ThumbsUp size={14} />
                                                                </button>
                                                                <span className="text-xs font-semibold text-white">{reply.votes}</span>
                                                                <button
                                                                    onClick={() => voteReply(post.id, reply.id, -1)}
                                                                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                                                >
                                                                    <ThumbsDown size={14} />
                                                                </button>
                                                            </div>
                                                            <button className="text-xs text-slate-400 hover:text-white transition-colors">
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
                                    <h3 className="text-xl font-bold text-white mb-2">No posts yet</h3>
                                    <p className="text-slate-400 mb-6">Be the first to share something in {selectedChannel}!</p>
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