import React, { useLayoutEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
// Use the globally loaded GSAP from CDN
declare const gsap: any;
import { Brain, Target, Sparkles, Users, Award, Heart, Star, Shield, Zap } from 'lucide-react';
import ContactForm from '../components/ContactForm';

const AboutUsPage: React.FC = () => {
  const { user } = useUser();
  const contentRef = useRef<HTMLDivElement>(null);

  const glassPanelStyle = "bg-black/20 border border-white/10 backdrop-blur-md";

  useLayoutEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(contentRef.current, 
        { autoAlpha: 0, y: 20 }, 
        { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.1 }
      );
    }
  }, []);

  const teamMembers = [
    {
      name: "Mrs. Alifya S.T.",
      role: "Board Approved Clinical Psychologist and Trauma Expert",
      bio: "Leading our clinical approach with expertise in trauma-informed care and child psychology",
      avatar: "/assets/images/alfiya.png",
      linkedin: "https://www.linkedin.com/in/alifya-st"
    },
    {
      name: "Sammy",
      role: "Psychologist with Neuroscience Expertise and Project Manager",
      bio: "Managing our neuroscience integration and project development with deep expertise in cognitive science",
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
      icon: <Brain className="w-8 h-8 text-violet-400" />,
      title: "Scientific Foundation",
      description: "Every game and activity is built on proven neuropsychological principles"
    },
    {
      icon: <Heart className="w-8 h-8 text-pink-400" />,
      title: "Child-Centered",
      description: "We put children's needs first, creating safe and nurturing learning environments"
    },
    {
      icon: <Target className="w-8 h-8 text-blue-400" />,
      title: "Personalized Learning",
      description: "Adaptive AI that grows with each child's unique learning journey"
    },
    {
      icon: <Sparkles className="w-8 h-8 text-yellow-400" />,
      title: "Innovation",
      description: "Cutting-edge technology meets timeless educational wisdom"
    }
  ];

  return (
    <div className="min-h-screen text-slate-200 pt-24 pb-12 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      <div className="container mx-auto px-6">
        <div ref={contentRef} className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-4">About Neuraplay</h1>
          <p className="text-xl text-violet-300 max-w-3xl mx-auto">
            We're on a mission to unlock every child's potential through scientifically-backed, AI-powered learning experiences.
          </p>
        </div>

        {/* Mission Section */}
        <div className={`${glassPanelStyle} p-8 rounded-2xl mb-8`}>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Our Mission</h2>
            <p className="text-lg text-slate-300 max-w-4xl mx-auto">
              At Neuraplay, we believe every child is a genius waiting to be discovered. 
              Through the power of neuropsychology and artificial intelligence, we create 
              personalized learning experiences that adapt to each child's unique cognitive profile.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">The Science Behind Our Approach</h3>
              <p className="text-slate-300 mb-4">
                Our platform is built on decades of neuropsychological research, combining 
                proven cognitive training methods with cutting-edge AI technology. Each game 
                and activity is designed to target specific cognitive functions while maintaining 
                the joy and wonder of childhood learning.
              </p>
              <p className="text-slate-300">
                We work closely with leading experts in child development, neuropsychology, 
                and educational technology to ensure our platform delivers measurable cognitive 
                improvements while keeping children engaged and motivated.
              </p>
            </div>
            <div className="flex justify-center">
              <div className="w-64 h-64 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                <Brain className="w-32 h-32 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className={`${glassPanelStyle} p-8 rounded-2xl mb-8`}>
          <h2 className="text-3xl font-bold text-white text-center mb-8">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div key={index} className="text-center p-6 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                <div className="flex justify-center mb-4">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{value.title}</h3>
                <p className="text-slate-300 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div className={`${glassPanelStyle} p-8 rounded-2xl mb-8`}>
          <h2 className="text-3xl font-bold text-white text-center mb-8">Meet Our Team</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="text-center p-6 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                <img 
                  src={member.avatar} 
                  alt={member.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-violet-200"
                />
                <h3 className="text-xl font-bold text-white mb-2">{member.name}</h3>
                <p className="text-violet-300 font-semibold mb-3">{member.role}</p>
                <p className="text-slate-300 text-sm mb-4">{member.bio}</p>
                {member.linkedin && (
                  <a 
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
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
        <div className={`${glassPanelStyle} p-8 rounded-2xl mb-8`}>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Our Impact</h2>
            <p className="text-lg text-slate-300 max-w-4xl mx-auto">
              Since our launch, we've helped thousands of children develop essential cognitive skills 
              while having fun and building confidence in their learning abilities.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-violet-400 mb-2">10,000+</div>
              <div className="text-slate-300">Children Empowered</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">95%</div>
              <div className="text-slate-300">Parent Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">41</div>
              <div className="text-slate-300">Cognitive Skills Targeted</div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className={`${glassPanelStyle} p-8 rounded-2xl text-center`}>
          <h2 className="text-3xl font-bold text-white mb-4">Get in Touch</h2>
          <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
            Have questions about our platform or want to learn more about how we can help your child? 
            We'd love to hear from you.
          </p>
          <ContactForm />
        </div>
      </div>
    </div>
  );
};

export default AboutUsPage; 