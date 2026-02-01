import React, { useState } from 'react';
import { Star, UserPlus, UserMinus, Edit2, Check, X, Users } from 'lucide-react';

interface ProfileCardProps {
  user: any;
  onUpdateBio: (bio: string) => void;
  onRemoveFriend: (friendId: string) => void;
  onAcceptFriend: (friendId: string) => void;
  onRejectFriend: (friendId: string) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ user, onUpdateBio, onRemoveFriend, onAcceptFriend, onRejectFriend }) => {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user?.profile.about || '');
  const [bioSaved, setBioSaved] = useState(false);

  const handleBioSave = () => {
    onUpdateBio(bio);
    setBioSaved(true);
    setTimeout(() => setBioSaved(false), 1500);
    setEditing(false);
  };

  return (
    <div className="card flex flex-col items-center p-6 mb-8 shadow-lg rounded-xl relative animate-fade-in bg-white">
      {/* Purple Gradient Profile Header */}
      <div className="w-full rounded-t-xl bg-gradient-to-r from-purple-600 to-violet-500 py-3 mb-4 flex items-center justify-center">
        <h2 className="text-xl font-bold text-white tracking-wide">Profile</h2>
      </div>
      <img
        src={user.profile.avatar}
        alt="Avatar"
        className="w-24 h-24 rounded-full border-4 border-white shadow-lg mb-2 transition-all hover:scale-105"
      />
      <h1 className="text-2xl font-bold mb-1 text-slate-900">{user.username}</h1>
      <div className="flex gap-2 items-center mb-1">
        <span className="text-md font-semibold text-violet-700">{user.role}</span>
        {user.age && <span className="text-md text-slate-500">Age: {user.age}</span>}
      </div>
      <div className="flex gap-4 items-center mb-2">
        <span className="flex items-center gap-1 text-yellow-500 font-bold"><Star className="w-5 h-5" /> {user.profile.stars} Stars</span>
        <span className="font-bold text-blue-600">XP: {user.profile.xp}</span>
        <span className="font-bold text-pink-600">Rank: {user.profile.rank}</span>
      </div>
      {/* Editable Bio */}
      <div className="w-full max-w-xs mb-4">
        {editing ? (
          <div className="flex flex-col gap-2 items-center">
            <textarea
              className="w-full p-2 rounded-xl border-2 border-violet-200 focus:border-violet-500 text-md"
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <button className="btn-gradient px-3 py-1 flex items-center gap-2" onClick={handleBioSave}>
                <Check className="w-4 h-4" /> Save
              </button>
              <button className="px-3 py-1 rounded-xl bg-slate-200 text-slate-700 font-bold" onClick={() => setEditing(false)}>
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
            {bioSaved && <span className="text-green-600 font-semibold mt-1">Saved!</span>}
          </div>
        ) : (
          <div className="bg-white/70 rounded-xl p-2 text-md text-slate-700 shadow-inner min-h-[40px]">
            {user.profile.about || <span className="text-slate-400">No bio yet. Click edit to add one!</span>}
            <button className="ml-2 text-violet-500 hover:text-violet-700" onClick={() => setEditing(true)}><Edit2 className="w-4 h-4 inline" /></button>
          </div>
        )}
      </div>
      {/* Friend List */}
      <div className="w-full mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-blue-500" />
          <span className="font-bold text-slate-900">Friends</span>
          <span className="ml-2 text-slate-500">({user.friends?.length || 0})</span>
        </div>
        {(user.friends?.length || 0) === 0 ? (
          <div className="text-slate-500">No friends yet. Find friends in the forum!</div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(user.friends || []).map((fid: string) => (
              <div key={fid} className="flex flex-col items-center min-w-[60px]">
                {/* Placeholder: Replace with friend avatar/username lookup */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-300 to-blue-200 shadow-lg mb-1 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <span className="font-semibold text-slate-700 text-xs">Friend</span>
                <button className="mt-1 px-2 py-1 rounded-xl bg-red-100 text-red-600 font-bold text-xs hover:bg-red-200 transition-all" onClick={() => onRemoveFriend(fid)}>
                  <UserMinus className="w-4 h-4 inline" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Friend Requests */}
      <div className="w-full mb-2">
        <div className="flex items-center gap-2 mb-2">
          <UserPlus className="w-5 h-5 text-green-500" />
          <span className="font-bold text-slate-900">Friend Requests</span>
          <span className="ml-2 text-slate-500">({user.friendRequests?.received?.length || 0})</span>
        </div>
        {(!user.friendRequests || (user.friendRequests.received?.length || 0) === 0) ? (
          <div className="text-slate-500">No pending requests.</div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(user.friendRequests.received || []).map((fid: string) => (
              <div key={fid} className="flex flex-col items-center min-w-[60px]">
                {/* Placeholder: Replace with friend avatar/username lookup */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-300 to-blue-200 shadow-lg mb-1 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <span className="font-semibold text-slate-700 text-xs">Friend</span>
                <div className="flex gap-1 mt-1">
                  <button className="px-2 py-1 rounded-xl bg-green-100 text-green-600 font-bold text-xs hover:bg-green-200 transition-all" onClick={() => onAcceptFriend(fid)}>
                    <Check className="w-4 h-4 inline" />
                  </button>
                  <button className="px-2 py-1 rounded-xl bg-red-100 text-red-600 font-bold text-xs hover:bg-red-200 transition-all" onClick={() => onRejectFriend(fid)}>
                    <X className="w-4 h-4 inline" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCard; 