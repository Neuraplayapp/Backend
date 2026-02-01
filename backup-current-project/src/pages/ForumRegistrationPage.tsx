import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';

const ForumRegistrationPage: React.FC = () => {
  const { setUser } = useUser();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    role: '',
    age: 5,
    username: '',
    email: '',
    avatar: '/assets/placeholder.png'
  });
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [generatedAvatars, setGeneratedAvatars] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!formData.role || !formData.username.trim() || !formData.email.trim()) {
      alert('Please fill out all fields.');
      return;
    }

    const newUser = {
      id: Date.now().toString(),
      username: formData.username,
      email: formData.email,
      role: formData.role as 'learner' | 'parent',
      age: formData.role === 'learner' ? formData.age : undefined,
      profile: {
        avatar: formData.avatar,
        rank: 'New Learner',
        xp: 0,
        xpToNextLevel: 100,
        stars: 0,
        about: '',
        gameProgress: {}
      },
      journeyLog: [],
      hasPosted: false
    };

    setUser(newUser);
    navigate('/forum');
  };

  const handleGenerateAvatar = async () => {
    if (!avatarPrompt.trim()) {
      setAvatarError('Please enter a description for your avatar.');
      return;
    }
    setGeneratingAvatar(true);
    setAvatarError('');
    
    try {
      console.log('Generating avatar with prompt:', avatarPrompt);
      
      const response = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: 'image',
          input_data: avatarPrompt
        })
      });
      
      console.log('Avatar generation response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to get response' }));
        console.error('Avatar generation error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Avatar generation result:', result);
      
      if (result.data && result.data.length > 0) {
        const imageBlob = `data:${result.contentType || 'image/png'};base64,${result.data}`;
        console.log('Generated avatar blob length:', imageBlob.length);
        setGeneratedAvatars(prev => [...prev, imageBlob]);
        setFormData({ ...formData, avatar: imageBlob });
      } else if (result.data) {
        // Handle case where data is a string (not array)
        const imageBlob = `data:${result.contentType || 'image/png'};base64,${result.data}`;
        console.log('Generated avatar blob length:', imageBlob.length);
        setGeneratedAvatars(prev => [...prev, imageBlob]);
        setFormData({ ...formData, avatar: imageBlob });
      } else {
        console.error('No image data in response:', result);
        setAvatarError('Failed to generate avatar. Please try again.');
      }
    } catch (error) {
      console.error('Avatar generation error:', error);
      setAvatarError(`Error generating avatar: ${error.message}. Please try again.`);
    } finally {
      setGeneratingAvatar(false);
    }
  };

  const avatars = [
    ...generatedAvatars
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white py-24 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-8">
            <img 
              src="/assets/images/Mascot.png" 
              alt="NeuraPlay Mascot" 
              className="w-32 h-32 object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">Join the NeuraPlay Community</h1>
          <p className="text-xl text-violet-300">Create your free account and start your learning journey</p>
        </div>

        <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-xl">
          <div className="space-y-6">
            <div>
              <label className="block font-bold mb-4 text-white text-lg">I am a...</label>
              <div className="grid grid-cols-2 gap-4">
                {['learner', 'parent'].map(role => (
                  <button
                    key={role}
                    onClick={() => setFormData({ ...formData, role })}
                    className={`p-6 rounded-xl font-semibold text-lg transition-all border-2 ${
                      formData.role === role
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-violet-600 shadow-lg'
                        : 'bg-white/10 text-gray-300 border-white/20 hover:border-violet-400 hover:bg-white/20'
                    }`}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {formData.role === 'learner' && (
              <div>
                <label className="block font-bold mb-4 text-white text-lg">Learner's age</label>
                <select
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                  className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
                >
                  <option value={4} className="bg-slate-800">3-5 years</option>
                  <option value={7} className="bg-slate-800">6-8 years</option>
                  <option value={10} className="bg-slate-800">9-12 years</option>
                </select>
              </div>
            )}

            <div>
              <label className="block font-bold mb-4 text-white text-lg">Username</label>
              <input
                type="text"
                placeholder="Create a unique username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
              />
            </div>

            <div>
              <label className="block font-bold mb-4 text-white text-lg">Email</label>
              <input
                type="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
              />
            </div>

            <div>
              <h4 className="font-bold mb-4 text-white text-lg">Choose your hero avatar</h4>
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={avatarPrompt}
                  onChange={e => setAvatarPrompt(e.target.value)}
                  placeholder="Describe your avatar (e.g. brave robot, magical cat)"
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
                  disabled={generatingAvatar}
                />
                <button
                  type="button"
                  onClick={handleGenerateAvatar}
                  disabled={generatingAvatar || !avatarPrompt.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-xl hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                >
                  {generatingAvatar ? 'Generating...' : 'Generate'}
                </button>
              </div>
              {avatarError && <div className="text-red-400 text-sm mb-4">{avatarError}</div>}
                  
                  {/* Avatar Preview - Only show when generating or when avatar is selected */}
                  {generatingAvatar && (
                    <div className="flex justify-center mb-6">
                      <div className="relative w-32 h-32">
                        {/* Outer force field ring */}
                        <div className="absolute inset-0 rounded-full border-4 border-violet-400/30 animate-pulse"></div>
                        {/* Middle force field ring */}
                        <div className="absolute inset-2 rounded-full border-2 border-violet-400/50 animate-spin" style={{ animationDuration: '3s' }}></div>
                        {/* Inner force field ring */}
                        <div className="absolute inset-4 rounded-full border border-violet-400/70 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                        {/* Central energy core */}
                        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-violet-400/20 to-purple-400/20 animate-pulse">
                          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-400/40 to-purple-400/40 animate-spin" style={{ animationDuration: '1.5s' }}></div>
                        </div>
                        {/* Energy particles */}
                        <div className="absolute inset-0 rounded-full">
                          <div className="absolute top-2 left-1/2 w-1 h-1 bg-violet-400 rounded-full animate-ping"></div>
                          <div className="absolute bottom-2 left-1/2 w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                          <div className="absolute left-2 top-1/2 w-1 h-1 bg-violet-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                          <div className="absolute right-2 top-1/2 w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!generatingAvatar && formData.avatar && (formData.avatar !== '/assets/placeholder.png' || formData.avatar.startsWith('data:')) && (
                    <div className="flex justify-center mb-6">
                      <img
                        src={formData.avatar}
                        alt="Avatar Preview"
                        className="w-32 h-32 rounded-full border-4 border-violet-400 shadow-lg"
                      />
                    </div>
                  )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!formData.role || !formData.username.trim() || !formData.email.trim()}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold px-8 py-4 rounded-xl hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg text-lg"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForumRegistrationPage;