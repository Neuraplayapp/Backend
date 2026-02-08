import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useParallax } from '../hooks/useParallax';
import ContactForm from '../components/ContactForm';
import { Sparkles, Users, Target, Shield, Heart, Linkedin } from 'lucide-react';
const AboutUsPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const scrollY = useParallax();

  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    const sections = document.querySelectorAll('[data-animate]');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const teamMembers = [
    {
      name: "Mrs. Alifya S.T.",
      role: "Clinical Psychologist & Trauma Expert",
      bio: "Board approved clinical psychologist with expertise in post-trauma therapy and educational psychology",
      avatar: "/assets/images/Alfiya.png",
      linkedin: "https://www.linkedin.com/in/alifya-st"
    },
    {
      name: "Sammy",
      role: "Neuroscience Expert & Project Manager",
      bio: "Medical background as a nurse with education in clinical psychology and neuroscience expertise",
      avatar: "/assets/images/sammy.jpg",
      linkedin: "https://www.linkedin.com/in/sammy-martin-tunell/"
    },
    {
      name: "Mohammad Abulhassan",
      role: "Senior IT Advisor & Technology Consultant",
      bio: "Over 4 decades of experience in complex team management. Former CIO Advisor at Saudi Airlines with expertise in IT Masterplan development",
      avatar: "/assets/images/mohammad.jpg",
      linkedin: "https://www.linkedin.com/in/mabulhassan/"
    }
  ];

  const values = [
    {
      icon: Sparkles,
      gradient: "from-purple-500 to-indigo-600",
      title: "Scientific Foundation",
      description: "Every activity is built on proven neuropsychological principles and research"
    },
    {
      icon: Heart,
      gradient: "from-pink-500 to-purple-600",
      title: "Learner-Centered",
      description: "We put learners first, creating safe and nurturing learning environments"
    },
    {
      icon: Target,
      gradient: "from-blue-500 to-purple-600",
      title: "Personalized Learning",
      description: "Adaptive AI that grows with each individual's unique learning journey"
    },
    {
      icon: Shield,
      gradient: "from-indigo-500 to-purple-600",
      title: "Innovation",
      description: "Cutting-edge technology meets timeless educational wisdom"
    }
  ];

  const globalStyles = `
    html {
      scroll-behavior: smooth;
    }

    .fade-in-section {
      opacity: 0;
      transform: translateY(40px);
      transition: opacity 1s ease-out, transform 1s ease-out;
    }

    .fade-in-section.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .glass-card {
      background: ${isDarkMode ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.9)'};
      backdrop-filter: blur(20px);
      border: 1px solid ${isDarkMode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)'};
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .glass-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 60px ${isDarkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)'};
      border-color: ${isDarkMode ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.3)'};
    }

    .team-card {
      background: ${isDarkMode ? 'rgba(17, 24, 39, 0.6)' : 'rgba(255, 255, 255, 0.8)'};
      backdrop-filter: blur(16px);
      border: 1px solid ${isDarkMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)'};
      transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .team-card:hover {
      transform: translateY(-12px) scale(1.02);
      box-shadow: 0 25px 70px ${isDarkMode ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.25)'};
      border-color: ${isDarkMode ? 'rgba(139, 92, 246, 0.5)' : 'rgba(139, 92, 246, 0.3)'};
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }

    .floating {
      animation: float 6s ease-in-out infinite;
    }

    @keyframes pulse-glow {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 0.8; }
    }

    .stagger-1 { transition-delay: 0.1s; }
    .stagger-2 { transition-delay: 0.2s; }
    .stagger-3 { transition-delay: 0.3s; }
    .stagger-4 { transition-delay: 0.4s; }
  `;

  return (
    <>
      <style>{globalStyles}</style>

      {/* Hero Section - Full Screen */}
      <section className={`min-h-screen relative overflow-hidden pt-24 flex items-center ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-white to-purple-50'
        }`}>
        {/* Animated Grid Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: isDarkMode
                ? `linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px)`
                : `linear-gradient(rgba(139, 92, 246, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.06) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
              transform: `translateY(${scrollY * 0.15}px)`,
            }}
          />
        </div>

        {/* Gradient Mesh Background with Parallax */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-[800px] h-[800px] rounded-full blur-3xl"
            style={{
              background: isDarkMode
                ? 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(196, 181, 253, 0.5) 0%, transparent 70%)',
              top: '-20%',
              left: '-10%',
              transform: `translate(${scrollY * 0.08}px, ${scrollY * 0.12}px)`,
              animation: 'pulse-glow 8s ease-in-out infinite',
            }}
          />
          <div
            className="absolute w-[600px] h-[600px] rounded-full blur-3xl"
            style={{
              background: isDarkMode
                ? 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(233, 213, 255, 0.6) 0%, transparent 70%)',
              top: '10%',
              right: '-15%',
              transform: `translate(${scrollY * -0.06}px, ${scrollY * 0.1}px)`,
              animation: 'pulse-glow 10s ease-in-out infinite 2s',
            }}
          />
          <div
            className="absolute w-[700px] h-[700px] rounded-full blur-3xl"
            style={{
              background: isDarkMode
                ? 'radial-gradient(circle, rgba(124, 58, 237, 0.12) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(216, 180, 254, 0.4) 0%, transparent 70%)',
              bottom: '-10%',
              left: '30%',
              transform: `translateY(${scrollY * -0.15}px)`,
              animation: 'pulse-glow 12s ease-in-out infinite 4s',
            }}
          />
        </div>

        {/* Mountain Parallax Layers */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg
            className="absolute bottom-0 w-full h-64 md:h-80"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            style={{
              transform: `translateY(${scrollY * 0.25}px) translateZ(0)`,
              willChange: 'transform'
            }}
          >
            {/* Far mountains - lightest */}
            <path
              d="M0,160 L240,100 L480,140 L720,80 L960,120 L1200,100 L1440,140 L1440,320 L0,320 Z"
              fill={isDarkMode
                ? "url(#farMountainGradientDark)"
                : "url(#farMountainGradientLight)"}
              opacity="0.4"
            />
            <defs>
              <linearGradient id="farMountainGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="farMountainGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(196, 181, 253)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="rgb(233, 213, 255)" stopOpacity="0.5" />
              </linearGradient>
            </defs>
          </svg>

          <svg
            className="absolute bottom-0 w-full h-64 md:h-80"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            style={{
              transform: `translateY(${scrollY * 0.45}px) translateZ(0)`,
              willChange: 'transform'
            }}
          >
            {/* Mid mountains - medium */}
            <path
              d="M0,200 L360,140 L600,170 L840,130 L1080,160 L1320,145 L1440,180 L1440,320 L0,320 Z"
              fill={isDarkMode
                ? "url(#midMountainGradientDark)"
                : "url(#midMountainGradientLight)"}
              opacity="0.6"
            />
            <defs>
              <linearGradient id="midMountainGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="rgb(168, 85, 247)" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="midMountainGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(167, 139, 250)" stopOpacity="0.7" />
                <stop offset="100%" stopColor="rgb(196, 181, 253)" stopOpacity="0.6" />
              </linearGradient>
            </defs>
          </svg>

          <svg
            className="absolute bottom-0 w-full h-64 md:h-80"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            style={{
              transform: `translateY(${scrollY * 0.65}px) translateZ(0)`,
              willChange: 'transform'
            }}
          >
            {/* Near mountains - darkest */}
            <path
              d="M0,240 L300,190 L500,210 L700,180 L900,200 L1100,185 L1300,220 L1440,200 L1440,320 L0,320 Z"
              fill={isDarkMode
                ? "url(#nearMountainGradientDark)"
                : "url(#nearMountainGradientLight)"}
              opacity="0.8"
            />
            <defs>
              <linearGradient id="nearMountainGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="0.7" />
                <stop offset="100%" stopColor="rgb(124, 58, 237)" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="nearMountainGradientLight" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="rgb(124, 58, 237)" stopOpacity="0.7" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Hero Content */}
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">

            <h1 className={`text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
              Empowering Every
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600">
                Learner's Journey
              </span>
            </h1>
            <p className={`text-xl md:text-2xl mb-12 leading-relaxed max-w-3xl mx-auto ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
              We believe every learner is a genius waiting to be discovered through personalized,
              neuropsychology-powered education
            </p>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 floating">
          <div className={`w-6 h-10 rounded-full border-2 ${isDarkMode ? 'border-purple-400' : 'border-purple-600'
            } flex justify-center`}>
            <div className={`w-1.5 h-3 rounded-full mt-2 ${isDarkMode ? 'bg-purple-400' : 'bg-purple-600'
              }`} style={{ animation: 'float 2s ease-in-out infinite' }}></div>
          </div>
        </div>
      </section>

      {/* Mission Section - Split Layout */}
      <section
        id="mission-section"
        data-animate
        className={`py-24 relative overflow-hidden fade-in-section ${visibleSections.has('mission-section') ? 'visible' : ''
          } ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
      >
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                Our Mission
              </h2>
              <div className="w-20 h-1 bg-gradient-to-r from-purple-500 to-indigo-600 mb-8"></div>
              <p className={`text-lg leading-relaxed mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                We want any person who learns to reach for the sky and their potential.
                At Neuraplay, we believe every learner is a genius waiting to be discovered.
              </p>
              <p className={`text-lg leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                Through the power of neuropsychology and artificial intelligence, we create
                personalized learning experiences that adapt to each individual's unique cognitive profile.
              </p>
            </div>
            <div className="grid gap-6">
              <div className="glass-card p-8 rounded-2xl">
                <h3 className={`text-xl font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Individualized Pedagogy</h3>
                <p className={`leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                  Tailored tutoring based on best pedagogical principles that adapt to each learner's unique needs
                </p>
              </div>
              <div className="glass-card p-8 rounded-2xl">
                <h3 className={`text-xl font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Human-AI Ethics & Safety</h3>
                <p className={`leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                  Responsible AI implementation with robust ethical safeguards, security, and privacy protection
                </p>
              </div>
              <div className="glass-card p-8 rounded-2xl">
                <h3 className={`text-xl font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Learner Empowerment</h3>
                <p className={`leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                  Empowering learners to take ownership of their education and learn on their own terms
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section
        id="values-section"
        data-animate
        className={`py-24 relative overflow-hidden fade-in-section ${visibleSections.has('values-section') ? 'visible' : ''
          } ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}
      >
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Our Values</h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
              The principles that guide everything we do
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div
                  key={index}
                  className={`glass-card p-8 rounded-2xl text-center stagger-${index + 1}`}
                >
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${value.gradient} mb-6`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className={`text-xl font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{value.title}</h3>
                  <p className={`leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section
        id="team-section"
        data-animate
        className={`py-24 relative overflow-hidden fade-in-section ${visibleSections.has('team-section') ? 'visible' : ''
          } ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
      >
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Meet Our Team</h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
              Experts in psychology, neuroscience, and technology
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className={`team-card p-8 rounded-2xl text-center stagger-${index + 1}`}
              >
                <div className="relative inline-block mb-6">
                  <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 blur-lg opacity-50`}></div>
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="relative w-32 h-32 rounded-full object-cover border-4 border-purple-500/30"
                  />
                </div>
                <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{member.name}</h3>
                <p className={`text-sm font-medium mb-4 bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent`}>
                  {member.role}
                </p>
                <p className={`mb-6 leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>{member.bio}</p>
                {member.linkedin && (
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300 ${isDarkMode
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                  >
                    <Linkedin className="w-4 h-4" />
                    Connect
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section
        id="vision-section"
        data-animate
        className={`py-24 relative overflow-hidden fade-in-section ${visibleSections.has('vision-section') ? 'visible' : ''
          } ${isDarkMode ? 'bg-gradient-to-br from-purple-900/20 to-indigo-900/20' : 'bg-gradient-to-br from-purple-50 to-indigo-50'}`}
      >
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Our Vision</h2>
            <p className={`text-xl leading-relaxed mb-12 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
              We're building a platform that helps children develop essential cognitive skills
              while having fun and building confidence in their learning abilities.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="glass-card p-8 rounded-2xl stagger-1">
                <Users className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                <h3 className={`text-xl font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Growing Community</h3>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Join a thriving family of learners worldwide
                </p>
              </div>
              <div className="glass-card p-8 rounded-2xl stagger-2">
                <Target className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                <h3 className={`text-xl font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Personalized Approach</h3>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Adaptive learning tailored to each student
                </p>
              </div>
              <div className="glass-card p-8 rounded-2xl stagger-3">
                <Shield className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                  }`} />
                <h3 className={`text-xl font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>Safe & Ethical</h3>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Responsible AI with privacy protection
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="contact-section"
        data-animate
        className={`py-24 relative overflow-hidden fade-in-section ${visibleSections.has('contact-section') ? 'visible' : ''
          } ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
      >
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Get in Touch</h2>
              <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                Have questions about our platform? We'd love to hear from you.
              </p>
            </div>
            <div className="glass-card p-10 rounded-2xl">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AboutUsPage;