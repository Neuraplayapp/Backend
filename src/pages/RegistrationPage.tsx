import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { Check, Star } from 'lucide-react';

const LICENSE_TEXT = `Copyright (c) 2025 Neuraplay

This Software License Agreement ("Agreement") governs the access and use of Neuraplay ("Software"), an interactive software service developed and owned by [Your Name or Legal Entity], operating under the laws of the Republic of Kazakhstan.

By accessing, downloading, or using the Software, you ("User") agree to be bound by the terms of this Agreement.

1. LICENSE GRANT
Neuraplay grants the User a limited, non-transferable, non-exclusive, revocable license to access and use the Software strictly for personal or internal educational purposes, subject to the terms herein.

2. SUBSCRIPTION AND BILLING
Access to the Software is provided on a recurring subscription basis or through a free access tier ("Community"). Users agree to be billed monthly for paid subscriptions. Neuraplay reserves the right to adjust pricing, features, and access tiers at any time, with prior notice. Free access is granted at the sole discretion of Neuraplay.

2.1. SUBSCRIPTION TIERS AND AI USAGE LIMITS
- Premium Plan ($9.99/month): Limited AI access with usage restrictions
- Premium Plus Plan ($19.99/month): Completely unlimited AI access with no restrictions
- Yearly Plans: Include all features of respective monthly plans with additional benefits

AI usage limits are enforced based on subscription tier. Premium Plus subscribers receive unlimited AI access while Premium subscribers have restricted AI usage as determined by Neuraplay.

3. RESTRICTIONS
The User shall not:

Copy, modify, distribute, sublicense, or resell the Software or its core components;

Reverse engineer, decompile, or disassemble any part of the Software;

Use the Software or its content, including its underlying principles and game structures, to build, train, or enhance competing products, platforms, or AI systems;

Circumvent access controls or share account credentials;

Use the Software in any unlawful manner or to generate content that violates the Prohibited Use policies of Neuraplay or its integrated Third-Party Services.

4. OWNERSHIP AND CONTENT RIGHTS
4.1. Neuraplay Intellectual Property. All rights, title, and interest in and to the Software—including its design, code, branding, game mechanics, and all content provided by Neuraplay (excluding User Content and AI-Generated Content)—are and shall remain the exclusive property of Neuraplay. This includes the brand name Neuraplay™.

4.2. User-Generated Content. Users may post content in community forums or on their profiles ("User-Generated Content"). By posting such content, the User grants Neuraplay a worldwide, non-exclusive, royalty-free, perpetual license to use, reproduce, display, distribute, and prepare derivative works of the User-Generated Content in connection with operating and promoting the Software.

4.3. AI-Generated Content. The Software may allow the User to generate content, such as stories or videos, using integrated artificial intelligence tools ("AI-Generated Content"). Subject to this Agreement and the terms of any applicable Third-Party Service, the User owns the rights to the specific AI-Generated Content they create.

5. THIRD-PARTY SERVICES
The Software integrates features from third-party service providers, including but not limited to AI models for video generation (e.g., Google's Veo) and Text-to-Speech (TTS) services. The User's use of these features is subject to the terms and policies of those third-party providers. Neuraplay is not responsible or liable for the availability, accuracy, or content of these Third-Party Services.

6. EXPERT REVIEW AND DISCLAIMERS
The Software's content is informed by professionals in neuropsychology and clinical psychology. However, it is provided for educational and entertainment purposes only.

The Software is not a substitute for medical advice, diagnosis, or treatment.

AI-Generated Content is produced by automated systems and has not been reviewed by experts. Neuraplay does not guarantee its accuracy, appropriateness, or safety. Use is at the User’s own risk.

7. NO WARRANTIES
The Software is provided "AS IS" and "AS AVAILABLE," without warranties of any kind, express or implied. Neuraplay expressly disclaims all warranties, including but not limited to fitness for a particular purpose, merchantability, non-infringement, and any warranties regarding the reliability, content, or availability of the Software or its integrated Third-Party Services.

8. LIMITATION OF LIABILITY
Under no circumstances shall Neuraplay or its affiliates be liable for any indirect, incidental, special, or consequential damages, including but not limited to loss of data, revenue, or use, arising from or related to the use of the Software or any content generated therein.

9. TERMINATION
Neuraplay may suspend or terminate User access at any time if terms of this Agreement are violated. Upon termination, the User must immediately cease all use of the Software.

10. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of the Republic of Kazakhstan. Any disputes shall be subject to the exclusive jurisdiction of the courts of Kazakhstan.

11. CONTACT
For licensing, support, or legal inquiries, contact:
Neuraplay
[Your Website or Email Address]
`;

const RegistrationPage: React.FC = () => {
  const { setUser } = useUser();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    role: '',
    age: 5,
    username: '',
    email: '',
    avatar: '/assets/placeholder.png',
    agreeToTerms: false
  });
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [generatedAvatars, setGeneratedAvatars] = useState<string[]>([]);
  const [avatarGenerated, setAvatarGenerated] = useState(false);
  const [showLicense, setShowLicense] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<'premium' | 'premium-plus' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>(null);

  const avatars = [
    ...generatedAvatars
  ];

  const handleStepOne = () => {
    if (!formData.role || !formData.username.trim() || !formData.email.trim() || !formData.agreeToTerms) {
      alert('Please fill out all fields and agree to the terms.');
      return;
    }
    if (!selectedSubscription) {
      alert('Please select a subscription plan.');
      return;
    }
    if (!selectedPlan) {
      alert('Please select a billing period (Monthly or Yearly).');
      return;
    }
    setStep(2);
  };

  const handleComplete = async () => {
    try {
      // Call backend registration API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: 'temporary_password_123', // TODO: Add password field to form
          role: formData.role,
          age: formData.role === 'learner' ? formData.age : undefined,
          profile: {
            avatar: formData.avatar,
            rank: 'New Learner',
            xp: 0,
            xpToNextLevel: 100,
            stars: 0,
            about: '',
            gameProgress: {}
          }
        })
      });

      const result = await response.json();

      if (response.ok && result.user) {
        setUser(result.user);
        setStep(3);
        
        setTimeout(() => {
          navigate(formData.role === 'learner' ? '/playground' : '/forum');
        }, 2000);
      } else {
        console.error('Registration failed:', result.message);
        alert('Registration failed: ' + (result.message || 'Please try again'));
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Network error during registration. Please check your connection.');
    }
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
      
      // Use the AI service with tool calling to generate avatar
      const { aiService } = await import('../services/AIService');
      
      const response = await aiService.sendMessage(
        `Generate an avatar image: ${avatarPrompt}. Make it child-friendly, colorful, and suitable as a profile picture.`,
        {
          user: { id: 'registration' },
          capabilities: { imageGeneration: true, toolCalling: true }
        },
        true // Enable tool calling
      );
      
      console.log('Avatar generation AI response:', response);
      
      // Extract image from tool results
      let imageData = null;
      if (response.tool_results && response.tool_results.length > 0) {
        const imageResult = response.tool_results.find(r => r.data?.image_url);
        if (imageResult) {
          imageData = imageResult.data.image_url;
        }
      }
      
      if (!imageData) {
        throw new Error('No image generated from AI response');
      }
      
      // Create result object matching expected format  
      const result = {
        data: imageData,
        contentType: 'image/png'
      };
      
      console.log('Avatar generation result:', result);
      
      if (result.data) {
        // The image data is already a data URL from the tool result
        console.log('Generated avatar URL length:', result.data.length);
        setGeneratedAvatars(prev => [...prev, result.data]);
        setFormData({ ...formData, avatar: result.data });
        setAvatarGenerated(true);
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

  const handleSubscriptionSelect = (subscription: 'premium' | 'premium-plus') => {
    setSelectedSubscription(subscription);
  };

  const handlePlanSelect = (plan: 'monthly' | 'yearly') => {
    setSelectedPlan(plan);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-8">
            <img 
              src="/assets/images/Mascot.png" 
              alt="NeuraPlay Mascot" 
              className="w-32 h-32 object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-theme-primary mb-4">Join NeuraPlay Premium</h1>
          <p className="text-xl text-violet-300">Unlock the full potential of cognitive development</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 lg:p-10 shadow-xl min-h-[520px] flex flex-col gap-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full flex items-center justify-center">
                                  <Check className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-theme-primary mb-2">Step 1: Your Information</h2>
              <p className="text-theme-secondary">Let's get to know you better</p>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block font-bold mb-4 text-theme-primary text-lg">I am a...</label>
                  <div className="grid grid-cols-2 gap-6">
                    {['learner', 'parent'].map(role => (
                      <button
                        key={role}
                        onClick={() => setFormData({ ...formData, role })}
                        className={`min-w-[140px] min-h-[80px] p-6 rounded-xl font-semibold text-lg transition-all border-2 whitespace-pre-line break-words text-center flex flex-col items-center justify-center shadow-sm ${
                          formData.role === role
                            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-violet-600 shadow-lg'
                            : 'bg-white/10 text-theme-primary border-white/20 hover:border-violet-400 hover:bg-white/20'
                        }`}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.role === 'learner' && (
                  <div>
                    <label className="block font-bold mb-4 text-theme-primary text-lg">Learner's age</label>
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
                  <label className="block font-bold mb-4 text-theme-primary text-lg">Username</label>
                  <input
                    type="text"
                    placeholder="Create a unique username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-4 text-theme-primary text-lg">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
                  />
                </div>

                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                    className="mt-1 w-5 h-5 text-violet-600 bg-white/10 border-white/20 rounded focus:ring-violet-400 focus:ring-2"
                  />
                  <label htmlFor="agreeToTerms" className="text-sm text-theme-secondary">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowLicense(true)}
                      className="text-violet-400 hover:text-violet-300 underline"
                    >
                      Terms of Service
                    </button>
                  </label>
                </div>

                <button
                  onClick={handleStepOne}
                  disabled={!formData.role || !formData.username.trim() || !formData.email.trim() || !formData.agreeToTerms}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold px-8 py-4 rounded-xl hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg text-lg"
                >
                  Continue to Avatar Creation
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Avatar Creation */}
          {step === 2 && (
            <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 lg:p-10 shadow-xl min-h-[520px] flex flex-col gap-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full flex items-center justify-center">
                                  <Star className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-theme-primary mb-2">Step 2: Create Your Avatar</h2>
              <p className="text-theme-secondary">Design your unique hero character</p>
              </div>

              <div className="space-y-8">
                <div>
                  <h4 className="font-bold mb-4 text-theme-primary text-lg">Choose your hero avatar</h4>
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
                  onClick={handleComplete}
                  disabled={!formData.avatar}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold px-8 py-4 rounded-xl hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg text-lg"
                >
                  Complete Registration
                </button>
              </div>
            </div>
          )}

          {/* Premium Features Sidebar */}
          <div 
            onClick={() => handleSubscriptionSelect('premium')}
            className={`bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 lg:p-10 shadow-xl min-h-[520px] transition-all duration-200 cursor-pointer ${
              selectedSubscription === 'premium' 
                ? 'border-violet-400/70 bg-violet-600/20 ring-2 ring-violet-400/30' 
                : 'hover:border-violet-400/30 hover:bg-violet-600/5'
            }`}
          >
            <div className="text-center mb-8 relative">
              {selectedSubscription === 'premium' && (
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
                <Star className="w-8 h-8 text-white" />
              </div>
                              <h2 className="text-2xl font-bold text-theme-primary mb-2">Premium Features</h2>
                <p className="text-theme-secondary">Unlock the full NeuraPlay experience</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-theme-primary">Unlimited AI Learning & Games</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-theme-primary">AI-Agency with Personally Tailored Learning</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-theme-primary">Advanced Progress Analytics</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-theme-primary">Personalized Learning Paths</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-theme-primary">Priority Customer Support</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-theme-primary">Exclusive Educational Content</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Monthly Plan */}
              <button
                onClick={() => {
                  handleSubscriptionSelect('premium');
                  handlePlanSelect('monthly');
                }}
                className={`p-3 rounded-xl border transition-all duration-200 text-center ${
                  selectedPlan === 'monthly' && selectedSubscription === 'premium'
                    ? 'border-violet-400/70 bg-violet-600/20' 
                    : 'border-violet-400/30 bg-gradient-to-r from-violet-600/20 to-purple-600/20 hover:border-violet-400/50 hover:bg-violet-600/15'
                }`}
              >
                <div className="text-lg font-bold text-white mb-1">$9.99</div>
                <div className="text-theme-secondary text-sm">Monthly</div>
              </button>
              
              {/* Yearly Plan */}
              <button
                onClick={() => {
                  handleSubscriptionSelect('premium');
                  handlePlanSelect('yearly');
                }}
                className={`p-3 rounded-xl border-2 relative transition-all duration-200 text-center ${
                  selectedPlan === 'yearly' && selectedSubscription === 'premium'
                    ? 'border-green-400/70 bg-green-600/20' 
                    : 'border-green-400/50 bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:border-green-400/60 hover:bg-green-600/15'
                }`}
              >
                <div className="absolute -top-2 -right-2 bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                  20% OFF
                </div>
                <div className="text-lg font-bold text-white mb-1">$95.90</div>
                <div className="text-theme-secondary text-sm">Yearly</div>
              </button>
            </div>
          </div>
          
          {/* Premium Plus Subscription Card */}
          <div 
            onClick={() => handleSubscriptionSelect('premium-plus')}
            className={`bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 lg:p-10 shadow-xl min-h-[520px] transition-all duration-200 cursor-pointer ${
              selectedSubscription === 'premium-plus' 
                ? 'border-amber-400/70 bg-amber-600/20 ring-2 ring-amber-400/30' 
                : 'hover:border-amber-400/30 hover:bg-amber-600/5'
            }`}
          >
            <div className="text-center mb-8 relative">
              {selectedSubscription === 'premium-plus' && (
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <Star className="w-8 h-8 text-white" />
              </div>
                              <h2 className="text-2xl font-bold text-theme-primary mb-2">Premium Plus</h2>
                <p className="text-theme-secondary">Unlimited AI Access</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Monthly Plan */}
              <button
                onClick={() => {
                  handleSubscriptionSelect('premium-plus');
                  handlePlanSelect('monthly');
                }}
                className={`p-3 rounded-xl border transition-all duration-200 text-center ${
                  selectedPlan === 'monthly' && selectedSubscription === 'premium-plus'
                    ? 'border-amber-400/70 bg-amber-600/20' 
                    : 'border-amber-400/30 bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:border-amber-400/50 hover:bg-amber-600/15'
                }`}
              >
                <div className="text-lg font-bold text-white mb-1">$19.99</div>
                <div className="text-theme-secondary text-sm">Monthly</div>
              </button>
              
              {/* Yearly Plan */}
              <button
                onClick={() => {
                  handleSubscriptionSelect('premium-plus');
                  handlePlanSelect('yearly');
                }}
                className={`p-3 rounded-xl border transition-all duration-200 text-center ${
                  selectedPlan === 'yearly' && selectedSubscription === 'premium-plus'
                    ? 'border-amber-400/70 bg-amber-600/20' 
                    : 'border-amber-400/30 bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:border-amber-400/50 hover:bg-amber-600/15'
                }`}
              >
                <div className="text-lg font-bold text-white mb-1">$199.90</div>
                <div className="text-theme-secondary text-sm">Yearly</div>
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-theme-primary text-sm">Unlimited AI Access</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-theme-primary text-sm">No Usage Limits</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-theme-primary text-sm">All Premium Features</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-theme-primary text-sm">Priority Support</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-theme-primary text-sm">Advanced Analytics</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-theme-primary text-sm">Exclusive Content</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Integration Notice */}
        {(selectedSubscription && selectedPlan) && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600/20 to-amber-600/20 border border-violet-400/30 rounded-xl px-6 py-4 backdrop-blur-md">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-theme-primary font-medium">
                {selectedSubscription === 'premium' ? 'Premium' : 'Premium Plus'} {selectedPlan} plan selected
              </span>
              <div className="text-theme-secondary text-sm ml-4">
                Payment integration coming soon
              </div>
            </div>
          </div>
        )}

        {/* License Modal */}
        {showLicense && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-black/90 border border-white/10 rounded-2xl p-8 max-w-4xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-theme-primary">Terms of Service</h3>
                <button
                  onClick={() => setShowLicense(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="text-theme-secondary whitespace-pre-wrap text-sm leading-relaxed">
                {LICENSE_TEXT}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationPage;