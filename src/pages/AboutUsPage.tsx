import React, { useLayoutEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import ContactForm from '../components/ContactForm';

const AboutUsPage: React.FC = () => {
  const { user } = useUser();
  const { isDarkMode } = useTheme();
  const contentRef = useRef<HTMLDivElement>(null);

  const glassPanelStyle = isDarkMode 
    ? "bg-gray-900/80 backdrop-blur-lg border border-gray-700 shadow-sm" 
    : "bg-white/95 backdrop-blur-md border border-gray-200 shadow-sm";

  useLayoutEffect(() => {
    if (contentRef.current) {
      // Simple fade-in animation (GSAP not available in stub)
      contentRef.current.style.opacity = '0';
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.style.transition = 'opacity 0.5s ease-out';
          contentRef.current.style.opacity = '1';
        }
      }, 100);
    }
  }, []);

  const teamMembers = [
    {
      name: "Mrs. Alifya S.T.",
      role: "Board Approved Clinical Psychologist and Trauma Expert",
      bio: "Teacher and psychologist with an expertise in post-trauma",
      avatar: "/assets/images/Alfiya.png",
      linkedin: "https://www.linkedin.com/in/alifya-st"
    },
    {
      name: "Sammy",
      role: "Psychological Expert with Neuroscience Expertise and Project Manager",
      bio: "Medical background as a nurse with education in clinical psychology and a degree in psychology",
      avatar: "/assets/images/sammy.jpg",
      linkedin: "https://www.linkedin.com/in/sammy-martin-tunell/"
    },
    {
      name: "Mohammad Abulhassan",
      role: "Senior IT Advisor and Technology Consultant",
      bio: "Senior advisor and IT consultant with over 4 decades of experience in complex team management. Former CIO Advisor at Saudi Airlines with expertise in Information Technology Business Planning and Management. Specializes in IT Masterplan development and execution, having successfully led one of the largest technology transformations in the airlines industry.",
      avatar: "/assets/images/mohammad.jpg",
      linkedin: "https://www.linkedin.com/in/mabulhassan/"
    }
  ];

  const values = [
    {
      gradient: "from-indigo-400 to-indigo-500",
      title: "Scientific Foundation",
      description: "Every activity is built on proven neuropsychological principles"
    },
    {
      gradient: "from-slate-400 to-slate-500",
      title: "Learner-Centered",
      description: "We put learners first, creating safe and nurturing learning environments"
    },
    {
      gradient: "from-blue-400 to-blue-500",
      title: "Personalized Learning",
      description: "Adaptive AI that grows with each individual's unique learning journey"
    },
    {
      gradient: "from-gray-400 to-gray-500",
      title: "Innovation",
      description: "Cutting-edge technology meets timeless educational wisdom"
    }
  ];

  const globalStyles = `
    .dark-hero-gradient {
      background: linear-gradient(135deg, #111827 0%, #1f2937 50%, #374151 100%);
    }
    
    .light-hero-gradient {
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 50%, #e5e7eb 100%);
    }
  `;

  return (
    <>
      <style>{globalStyles}</style>
      <div className={`min-h-screen pt-24 pb-12 ${
        isDarkMode ? 'dark-hero-gradient' : 'light-hero-gradient'
      }`}>
      <div className="container mx-auto px-6">
        <div ref={contentRef} className="text-center mb-20">
          <h1 className={`text-4xl md:text-5xl font-light tracking-tight ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>About Neuraplay</h1>
        </div>

        {/* Mission Section */}
        <div className={`${glassPanelStyle} rounded-lg mb-12 overflow-hidden`}>
          {/* Hero Image - Minimalist sky and mountains */}
          <div className="relative h-64 md:h-80 overflow-hidden">
            <div className={`absolute inset-0 ${
              isDarkMode 
                ? 'bg-gradient-to-b from-gray-800 via-gray-700 to-gray-600' 
                : 'bg-gradient-to-b from-gray-100 via-gray-50 to-white'
            }`}>
              {/* Sky gradient */}
              <div className={`absolute inset-0 ${
                isDarkMode 
                  ? 'bg-gradient-to-b from-gray-900/20 to-transparent' 
                  : 'bg-gradient-to-b from-gray-200/20 to-transparent'
              }`}></div>
              
              {/* Mountain silhouettes - Minimalist */}
              <svg className="absolute bottom-0 w-full h-48" viewBox="0 0 1200 300" preserveAspectRatio="none">
                {/* Far mountains */}
                <path d="M0,200 L200,100 L400,150 L600,80 L800,130 L1000,100 L1200,160 L1200,300 L0,300 Z" 
                      fill={isDarkMode ? "rgba(99, 102, 241, 0.08)" : "rgba(196, 181, 253, 0.3)"} />
                {/* Mid mountains */}
                <path d="M0,250 L300,150 L500,180 L700,140 L900,170 L1200,200 L1200,300 L0,300 Z" 
                      fill={isDarkMode ? "rgba(139, 92, 246, 0.12)" : "rgba(196, 181, 253, 0.4)"} />
                {/* Near mountains */}
                <path d="M0,280 L200,220 L400,240 L600,200 L800,230 L1000,210 L1200,250 L1200,300 L0,300 Z" 
                      fill={isDarkMode ? "rgba(168, 85, 247, 0.15)" : "rgba(196, 181, 253, 0.5)"} />
              </svg>
            </div>
          </div>
          
          <div className="p-10">
            <div className="text-center mb-16">
              <h2 className={`text-3xl font-light mb-8 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Our Mission</h2>
              <p className={`text-base max-w-3xl mx-auto leading-loose ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                We want any person who learns to reach for the sky and their potential. 
                At Neuraplay, we believe every learner is a genius waiting to be discovered. 
                Through the power of neuropsychology and artificial intelligence, we create 
                personalized learning experiences that adapt to each individual's unique cognitive profile.
              </p>
            </div>
          
          <div className="mt-16">
            <h3 className={`text-2xl font-light mb-10 text-center ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>The Science Behind Our Approach</h3>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className={`p-10 rounded-lg border ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <h4 className={`font-light mb-4 text-lg ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Individualized Pedagogy</h4>
                <p className={`text-sm leading-loose ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Tailored tutoring based on best pedagogical principles that adapt to each learner's unique needs
                </p>
              </div>

              <div className={`p-10 rounded-lg border ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <h4 className={`font-light mb-4 text-lg ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Human-AI Ethics & Safety</h4>
                <p className={`text-sm leading-loose ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Responsible AI implementation with robust ethical safeguards, security, and privacy protection
                </p>
              </div>

              <div className={`p-10 rounded-lg border ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <h4 className={`font-light mb-4 text-lg ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Learner Empowerment</h4>
                <p className={`text-sm leading-loose ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Empowering learners to take ownership of their education and learn on their own terms
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Values Section */}
        <div className={`${glassPanelStyle} p-10 rounded-lg mb-12`}>
          <h2 className={`text-3xl font-light text-center mb-12 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className={`p-8 rounded-lg border ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                {/* Minimal accent line */}
                <div className={`w-12 h-1 rounded bg-gradient-to-r ${value.gradient} mb-6 opacity-60`}></div>
                
                <h3 className={`text-base font-light mb-3 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{value.title}</h3>
                <p className={`text-sm leading-loose ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div className={`${glassPanelStyle} p-10 rounded-lg mb-12`}>
          <h2 className={`text-3xl font-light text-center mb-12 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Meet Our Team</h2>
          <div className="grid md:grid-cols-3 gap-10">
            {teamMembers.map((member, index) => (
              <div key={index} className={`text-center p-8 rounded-lg border ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <img 
                  src={member.avatar} 
                  alt={member.name}
                  className={`w-24 h-24 rounded-full mx-auto mb-6 border-2 ${
                    isDarkMode ? 'border-gray-600' : 'border-gray-300'
                  }`}
                />
                <h3 className={`text-lg font-light mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>{member.name}</h3>
                <p className={`text-sm mb-4 ${
                  isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                }`}>{member.role}</p>
                <p className={`text-sm mb-6 leading-loose ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>{member.bio}</p>
                {member.linkedin && (
                  <a 
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded text-sm transition-colors ${
                      isDarkMode ? 'bg-indigo-900/50 text-indigo-200 hover:bg-indigo-900/70' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                    </svg>
                    LinkedIn
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Impact Section */}
        <div className={`${glassPanelStyle} p-10 rounded-lg mb-12`}>
          <div className="text-center mb-12">
            <h2 className={`text-3xl font-light mb-6 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Our Vision</h2>
            <p className={`text-base max-w-3xl mx-auto leading-loose ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              We're building a platform that helps children develop essential cognitive skills 
              while having fun and building confidence in their learning abilities.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className={`text-lg font-light mb-3 ${
                isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
              }`}>Join a growing family</div>
              <div className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Be part of our learning community</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-light mb-3 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>Individualized Pedagogy</div>
              <div className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Research-based learning principles adapted to each learner</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-light mb-3 ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>Human-AI Ethics & Safety</div>
              <div className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Responsible AI with ethical safeguards and privacy protection</div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className={`${glassPanelStyle} p-10 rounded-lg text-center`}>
          <h2 className={`text-3xl font-light mb-6 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Get in Touch</h2>
          <p className={`mb-8 max-w-2xl mx-auto text-base leading-loose ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Have questions about our platform or want to learn more about how we can help your child? 
            We'd love to hear from you.
          </p>
          <ContactForm />
        </div>
      </div>
    </div>
    </>
  );
};

export default AboutUsPage;
