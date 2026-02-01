import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { Star, UserPlus, UserMinus, Edit2, Check, X, Users, ShieldAlert, UserX } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import AIAssistant from '../components/AIAssistant';

const ProfilePage: React.FC = () => {
  const { user, setUser } = useUser();
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Show login prompt if user is not logged in
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
            Please log in to view and manage your profile.
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
  
  // For demo, just use the current user if id matches username, otherwise fake user
  const isMe = user && id === user.username;
  // TODO: Replace with real user lookup
  const profileUser = isMe ? user : {
    username: id,
    profile: {
      avatar: '/assets/placeholder.png',
      rank: 'Learner',
      xp: 0,
      xpToNextLevel: 100,
      stars: 0,
      about: '',
      gameProgress: {}
    },
    role: 'learner',
    age: 8,
    friends: [],
    friendRequests: { sent: [], received: [] },
    journeyLog: [],
    hasPosted: false,
    email: '',
    id: id,
  };
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(profileUser?.profile.about || '');
  const [bioSaved, setBioSaved] = useState(false);

  if (!profileUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-animated">
        <div className="card p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">User not found.</h2>
        </div>
      </div>
    );
  }

  const handleBioSave = () => {
    if (!isMe) return;
    setUser({ ...user, profile: { ...user.profile, about: bio } });
    setBioSaved(true);
    setTimeout(() => setBioSaved(false), 1500);
    setEditing(false);
  };
  const handleAddFriend = () => {
    if (!user || !profileUser) return;
    setUser({ ...user, friends: [...user.friends, profileUser.username] });
  };
  const handleRemoveFriend = () => {
    if (!user || !profileUser) return;
    setUser({ ...user, friends: user.friends.filter(fid => fid !== profileUser.username) });
  };
  const handleBlock = () => {
    window.alert('User blocked (demo).');
  };
  const handleReport = () => {
    window.location.href = `mailto:smt@neuraplay.biz?subject=Report User ${profileUser.username}&body=Reporting user: ${profileUser.username}`;
  };

  return (
    <div className="min-h-screen bg-animated py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Profile Header */}
        <div className="card flex flex-col items-center p-8 mb-8 shadow-lg rounded-xl relative animate-fade-in bg-gradient-to-r from-purple-600 to-violet-500">
          <img
            src={profileUser.profile.avatar}
            alt="Avatar"
            className="w-32 h-32 rounded-full border-4 border-white shadow-lg mb-4 transition-all hover:scale-105"
          />
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            {profileUser.username}
          </h1>
          <div className="flex gap-4 items-center mb-2">
            <span className="text-lg font-semibold text-violet-100">{profileUser.role}</span>
            {profileUser.age && <span className="text-lg text-violet-200">Age: {profileUser.age}</span>}
          </div>
          <div className="flex gap-4 items-center mb-4">
            <span className="flex items-center gap-1 text-yellow-200 font-bold"><Star className="w-5 h-5" /> {profileUser.profile.stars} Stars</span>
            <span className="font-bold text-blue-200">XP: {profileUser.profile.xp}</span>
            <span className="font-bold text-pink-200">Rank: {profileUser.profile.rank}</span>
          </div>
          {/* Editable Bio or Friend Actions */}
          <div className="w-full max-w-xl">
            {isMe ? (
              editing ? (
                <div className="flex flex-col gap-2 items-center">
                  <textarea
                    className="w-full p-4 rounded-xl border-2 border-violet-200 focus:border-violet-500 text-lg"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button className="btn-gradient px-4 py-2 flex items-center gap-2" onClick={handleBioSave}>
                      <Check className="w-4 h-4" /> Save
                    </button>
                    <button className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold" onClick={() => setEditing(false)}>
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                  {bioSaved && <span className="text-green-200 font-semibold mt-2">Saved!</span>}
                </div>
              ) : (
                <div className="bg-white/70 rounded-xl p-4 text-lg text-slate-700 shadow-inner min-h-[60px] flex items-center justify-between">
                  <span>{profileUser.profile.about || <span className="text-slate-400">No bio yet. Click edit to add one!</span>}</span>
                  <button className="ml-4 btn-gradient px-4 py-2 flex items-center gap-2" onClick={() => setEditing(true)}>
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                </div>
              )
            ) : (
              <div className="flex gap-2 mt-2">
                <button className="btn-gradient px-4 py-2 flex items-center gap-2" onClick={handleAddFriend}>
                  <UserPlus className="w-4 h-4" /> Add Friend
                </button>
                <button className="px-4 py-2 rounded-xl bg-red-100 text-red-600 font-bold flex items-center gap-2" onClick={handleRemoveFriend}>
                  <UserMinus className="w-4 h-4" /> Remove
                </button>
                <button className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold flex items-center gap-2" onClick={handleBlock}>
                  <UserX className="w-4 h-4" /> Block
                </button>
                <button className="px-4 py-2 rounded-xl bg-yellow-100 text-yellow-700 font-bold flex items-center gap-2" onClick={handleReport}>
                  <ShieldAlert className="w-4 h-4" /> Report
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Friend List */}
        <div className="card p-6 mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold">Friends</h2>
            <span className="ml-2 text-slate-500">({user.friends.length})</span>
          </div>
          {user.friends.length === 0 ? (
            <div className="text-slate-500">No friends yet. Find friends in the forum!</div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {user.friends.map(fid => (
                <div key={fid} className="flex flex-col items-center min-w-[100px]">
                  {/* Placeholder: Replace with friend avatar/username lookup */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-300 to-blue-200 shadow-lg mb-2 flex items-center justify-center">
                    <UserPlus className="w-8 h-8 text-white" />
                  </div>
                  <span className="font-semibold text-slate-700">Friend</span>
                  <button className="mt-2 px-3 py-1 rounded-xl bg-red-100 text-red-600 font-bold text-xs hover:bg-red-200 transition-all">
                    <UserMinus className="w-4 h-4 inline" /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friend Requests */}
        <div className="card p-6 mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-6 h-6 text-green-500" />
            <h2 className="text-2xl font-bold">Friend Requests</h2>
            <span className="ml-2 text-slate-500">({user.friendRequests.received.length})</span>
          </div>
          {user.friendRequests.received.length === 0 ? (
            <div className="text-slate-500">No pending requests.</div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {user.friendRequests.received.map(fid => (
                <div key={fid} className="flex flex-col items-center min-w-[100px]">
                  {/* Placeholder: Replace with friend avatar/username lookup */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-300 to-blue-200 shadow-lg mb-2 flex items-center justify-center">
                    <UserPlus className="w-8 h-8 text-white" />
                  </div>
                  <span className="font-semibold text-slate-700">Friend</span>
                  <div className="flex gap-2 mt-2">
                    <button className="px-3 py-1 rounded-xl bg-green-100 text-green-600 font-bold text-xs hover:bg-green-200 transition-all">
                      <Check className="w-4 h-4 inline" /> Accept
                    </button>
                    <button className="px-3 py-1 rounded-xl bg-red-100 text-red-600 font-bold text-xs hover:bg-red-200 transition-all">
                      <X className="w-4 h-4 inline" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Forum Activity Placeholder */}
        <div className="card p-6 animate-fade-in">
          <h2 className="text-2xl font-bold mb-4">Forum Activity</h2>
          <div className="text-slate-500">Recent posts and comments will appear here.</div>
        </div>

        {/* AI Teacher/Assistant Section */}
        <div className="card p-6 mb-8 animate-fade-in bg-gradient-to-r from-violet-500 to-purple-400 text-white flex items-center gap-4">
          <img src="/assets/neuraplaybrain.png" alt="AI Teacher" className="w-16 h-16 rounded-full border-2 border-white" />
          <div>
            <h3 className="text-xl font-bold mb-1">Synapse, your AI Teacher</h3>
            <p className="text-white/80">Ask me anything about learning, games, or your progress!</p>
          </div>
        </div>
        <AIAssistant />
      </div>
    </div>
  );
};

export default ProfilePage; 