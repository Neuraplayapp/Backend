import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brain, Target, Sparkles, Star, Heart, Trophy, Zap, Users, BookOpen, Gamepad2, ChevronDown, UserPlus, X, Shield, Award, Clock, Lock } from 'lucide-react';
import { isRegistrationEnabled } from '../config/features';
import PlasmaHeroPerformance from '../components/PlasmaHeroPerformance';
import Footer from '../components/Footer';
import BouncyLetters from '../components/BouncyLetters';
import LetterReveal from '../components/LetterReveal';
import SignUpChoiceModal from '../components/SignUpChoiceModal';
import SignUpModal from '../components/SignUpModal';
import RegularSignUpModal from '../components/RegularSignUpModal';
import LoginModal from '../components/LoginModal';
import { useTheme } from '../contexts/ThemeContext';

// Use the globally loaded GSAP from CDN
declare const gsap: any;
declare const ScrollTrigger: any;

const SmoothScrollSection = ({ children, className = "", ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => {
    return (
        <section className={`min-h-screen w-full ${className}`} {...props}>
            {children}
        </section>
    );
};

const HomePage: React.FC = () => {
    const { t } = useTranslation();
    const [currentSection, setCurrentSection] = useState(0);
    const [activeFeature, setActiveFeature] = useState(0);
    const [showSignUpModal, setShowSignUpModal] = useState(false);
    const [showRegularSignUpModal, setShowRegularSignUpModal] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const navigate = useNavigate();
    const scrollElementRef = useRef<HTMLDivElement>(null);
    const { isDarkMode, getThemeConfig } = useTheme();

    const sections = [
        { id: 'hero', title: 'Hero' },
        { id: 'features', title: 'Features' },
        { id: 'videos', title: 'Videos' },
        { id: 'content', title: 'Content' },
        { id: 'cta', title: 'Call to Action' },
        { id: 'releases', title: 'Releases' }
    ];

    useEffect(() => {
        // Simplified GSAP ScrollTrigger animations
        if (typeof gsap !== 'undefined' && gsap.registerPlugin) {
            gsap.registerPlugin(ScrollTrigger);

            // Simplified hero parallax
            const heroScene = gsap.timeline();
            ScrollTrigger.create({
                animation: heroScene,
                trigger: "#hero",
                start: "top top",
                end: "bottom top",
                scrub: 1
            });

            heroScene.to(".hero-content", { y: -50, opacity: 0.9 }, 0);

            // Simplified Features section - gentle fade in
            const featuresAnimation = gsap.timeline();
            
            gsap.set(".feature-card", {
                y: 30,
                opacity: 0
            });
            
            featuresAnimation.to(".feature-card", {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.2,
                ease: "power2.out"
            });
            
            ScrollTrigger.create({
                animation: featuresAnimation,
                trigger: "#features",
                start: "top 80%",
                end: "bottom 20%",
                toggleActions: "play none none none"
            });

            // Simplified Videos section
            const videosAnimation = gsap.timeline();
            
            gsap.set("#videos .video-card", {
                y: 40,
                opacity: 0
            });
            
            videosAnimation.to("#videos .video-card", {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.3,
                ease: "power2.out"
            });
            
            ScrollTrigger.create({
                animation: videosAnimation,
                trigger: "#videos",
                start: "top 80%",
                end: "bottom 20%",
                toggleActions: "play none none none"
            });
            
            // Simplified Content section
            const contentAnimation = gsap.timeline();
            
            gsap.set(".content-card", {
                y: 30,
                opacity: 0
            });
            
            contentAnimation.to(".content-card", {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.2,
                ease: "power2.out"
            });
            
            ScrollTrigger.create({
                animation: contentAnimation,
                trigger: "#content",
                start: "top 75%",
                end: "bottom 25%",
                toggleActions: "play none none none"
            });

            // Simplified CTA section
            const ctaAnimation = gsap.timeline();
            
            gsap.set("#cta .cta-element", {
                y: 30,
                opacity: 0
            });
            
            ctaAnimation.to("#cta .cta-element", {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.2,
                ease: "power2.out"
            });
            
            ScrollTrigger.create({
                animation: ctaAnimation,
                trigger: "#cta",
                start: "top 75%",
                end: "bottom 25%",
                toggleActions: "play none none none"
            });
            
            // Simplified Releases section
            const releasesAnimation = gsap.timeline();
            
            gsap.set(".release-card", {
                y: 30,
                opacity: 0
            });
            
            releasesAnimation.to(".release-card", {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.15,
                ease: "power2.out"
            });
            
            ScrollTrigger.create({
                animation: releasesAnimation,
                trigger: "#releases",
                start: "top 70%",
                end: "bottom 30%",
                toggleActions: "play none none none"
            });

            return () => {
                ScrollTrigger.getAll().forEach((trigger: any) => trigger.kill());
            };
        }
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const windowHeight = window.innerHeight;
            const currentSection = Math.floor(scrollTop / windowHeight);
            setCurrentSection(currentSection);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const features = [
        {
            id: 'neuro',
            title: t('home.features.neuro_title'),
            description: t('home.features.neuro_desc'),
            icon: <Brain className="w-8 h-8" />
        },
        {
            id: 'tailored',
            title: t('home.features.tailored_title'),
            description: t('home.features.tailored_desc'),
            icon: <Target className="w-8 h-8" />
        },
        {
            id: 'montessori',
            title: t('home.features.montessori_title'),
            description: t('home.features.montessori_desc'),
            icon: <Sparkles className="w-8 h-8" />
        }
    ];

    const globalStyles = `
        html {
            scroll-behavior: smooth;
        }
        
        ::-webkit-scrollbar {
            width: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.05);
        }
        
        ::-webkit-scrollbar-thumb {
            background: linear-gradient(45deg, #c4b5fd, #93c5fd);
            border-radius: 4px;
        }
        
        /* Simplified animations */
        .fade-in-up {
            animation: fadeInUp 0.8s ease-out forwards;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .slide-in-left {
            animation: slideInLeft 0.8s ease-out forwards;
        }
        
        @keyframes slideInLeft {
            from {
                opacity: 0;
                transform: translateX(-30px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        .slide-in-right {
            animation: slideInRight 0.8s ease-out forwards;
        }
        
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(30px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        /* Simplified hover effects */
        .enhanced-hover {
            transition: all 0.3s ease;
        }
        
        .enhanced-hover:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
        }
        
        .card-glow {
            box-shadow: 0 2px 10px rgba(139, 92, 246, 0.05);
            transition: box-shadow 0.3s ease;
        }
        
        .card-glow:hover {
            box-shadow: 0 4px 16px rgba(139, 92, 246, 0.1);
        }
        
        .gradient-text {
            background: linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa);
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: gradientShift 5s ease infinite;
        }
        
        @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }
        
        .hero-full-width {
            width: 100vw;
            margin-left: calc(-50vw + 50%);
            margin-right: calc(-50vw + 50%);
        }
        
        /* Professional spacing */
        .section-spacing {
            padding: 8rem 0;
        }
        
        .content-spacing {
            padding: 6rem 0;
        }
        
        .card-spacing {
            padding: 2.5rem;
            margin: 1.5rem 0;
        }
    `;

    return (
        <>
            <style>{globalStyles}</style>
            
            <div className="fixed right-8 top-1/2 transform -translate-y-1/2 z-[9998] space-y-3">
                {sections.map((section, index) => (
                    <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            currentSection === index 
                                ? 'bg-indigo-500 scale-125' 
                                : 'bg-gray-400/40 hover:bg-gray-400/60'
                        }`}
                        title={section.title}
                    />
                ))}
            </div>

            <div ref={scrollElementRef} className="relative z-20">
                <SmoothScrollSection id="hero" className="relative flex items-center justify-center text-white hero-full-width">
                <PlasmaHeroPerformance className="absolute inset-0 z-10" />
                <div className="hero-content relative z-20 text-center px-6 max-w-5xl text-animation-container">
                    <div className="mb-16 fade-in-up">
                        <h1 className="text-5xl md:text-7xl font-light leading-tight tracking-tight mb-6 text-white">
                            {t('home.hero.title')}
                        </h1>
                        <p className="text-lg md:text-xl max-w-3xl mx-auto text-white/90 leading-relaxed font-light">
                            {t('home.hero.subtitle')}
                        </p>
                    </div>
                    
                    {/* Mascot - Subtle presence */}
                    <div className="mb-12 fade-in-up">
                        <div className="flex justify-center mb-8">
                            <img 
                                src="/assets/images/Mascot.png" 
                                alt="NeuraPlay Mascot" 
                                className="w-20 h-20 md:w-24 md:h-24 object-contain opacity-90"
                                loading="eager"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16 max-w-5xl mx-auto">
                        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-8 enhanced-hover slide-in-left" style={{animationDelay: '0.2s'}}>
                            <Zap className="w-12 h-12 text-amber-200 mx-auto mb-5" />
                            <h3 className="font-bold text-xl mb-3">{t('home.hero.smart_learning')}</h3>
                            <p className="text-white/85 leading-relaxed">{t('home.hero.smart_learning_desc')}</p>
                        </div>
                        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-8 enhanced-hover" style={{animationDelay: '0.4s'}}>
                            <Users className="w-12 h-12 text-violet-200 mx-auto mb-5" />
                            <h3 className="font-bold text-xl mb-3">{t('home.hero.family_focused')}</h3>
                            <p className="text-white/85 leading-relaxed">{t('home.hero.family_focused_desc')}</p>
                        </div>
                        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-8 enhanced-hover slide-in-right" style={{animationDelay: '0.6s'}}>
                            <Gamepad2 className="w-12 h-12 text-sky-200 mx-auto mb-5" />
                            <h3 className="font-bold text-xl mb-3">{t('home.hero.fun_games')}</h3>
                            <p className="text-white/85 leading-relaxed">{t('home.hero.fun_games_desc')}</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-5 justify-center items-center">
                        <button 
                            onClick={() => navigate('/about')} 
                            className="bg-white font-semibold px-10 py-4 rounded-full hover:bg-gray-50 transition-all duration-300 text-lg text-indigo-600 enhanced-hover shadow-sm"
                        >
                            {t('home.hero.what_is_neuraplay')}
                        </button>
                        <button 
                            onClick={() => setShowSignUpModal(true)} 
                            className="bg-indigo-500 font-semibold px-10 py-4 rounded-full hover:bg-indigo-600 transition-all duration-300 text-lg text-white enhanced-hover flex items-center gap-2 shadow-sm"
                        >
                            <UserPlus className="w-5 h-5" />
                            {t('navigation.sign_up')}
                        </button>
                        <button 
                            onClick={() => navigate('/forum')} 
                            className="bg-white/25 backdrop-blur-md font-semibold px-10 py-4 rounded-full hover:bg-white/35 transition-all duration-300 text-lg text-white border border-white/40 enhanced-hover"
                        >
                            {t('home.hero.forum')}
                        </button>
                        <button 
                            onClick={() => navigate('/about')} 
                            className="bg-white/25 backdrop-blur-md font-semibold px-10 py-4 rounded-full hover:bg-white/35 transition-all duration-300 text-lg text-white border border-white/40 enhanced-hover"
                        >
                            {t('home.hero.about_us')}
                        </button>
                    </div>
                </div>
                
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                    <ChevronDown className="w-8 h-8 text-white/70" />
                </div>
            </SmoothScrollSection>
            </div>

            <main className="main-content" style={{position: 'relative', zIndex: 20}}>
                <SmoothScrollSection id="features" className={`section-spacing flex items-center justify-center relative ${
                    isDarkMode ? 'bg-gray-900' : 'bg-white'
                }`}>
                    {/* Bottom gradient blending INTO next section (Videos) */}
                    <div className={`absolute inset-x-0 bottom-0 h-48 pointer-events-none ${
                        isDarkMode 
                            ? 'bg-gradient-to-b from-transparent via-gray-900/50 to-gray-900' 
                            : 'bg-gradient-to-b from-transparent via-gray-50/50 to-gray-50'
                    }`}></div>
                    <div className="container mx-auto max-w-6xl px-6 relative z-10">
                        <div className="text-center mb-24">
                            <h2 className={`text-4xl md:text-5xl font-light mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {t('home.features.title')}
                            </h2>
                            <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {t('home.features.subtitle')}
                            </p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-20 items-center">
                            <div>
                                <h3 className={`text-3xl font-light mb-12 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                    {t('home.features.new_way_title')}
                                </h3>
                                <div className="space-y-5">
                                    {features.map((feature, index) => (
                                        <button 
                                            key={feature.id} 
                                            onClick={() => setActiveFeature(index)} 
                                            className={`feature-card w-full p-7 rounded-lg text-left transition-all duration-300 border ${
                                                activeFeature === index 
                                                    ? isDarkMode
                                                        ? 'bg-white/15 text-white border-white/40 shadow-md'
                                                        : 'bg-indigo-50 text-gray-900 border-indigo-200 shadow-sm'
                                                    : isDarkMode
                                                        ? 'bg-white/5 text-white/90 border-white/10 hover:bg-white/10 hover:border-white/20'
                                                        : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={`${activeFeature === index ? (isDarkMode ? 'text-white' : 'text-indigo-600') : (isDarkMode ? 'text-white/70' : 'text-gray-500')}`}>
                                                    {feature.icon}
                                                </div>
                                                <span className={`font-normal text-base ${activeFeature === index ? (isDarkMode ? 'text-white' : 'text-gray-900') : (isDarkMode ? 'text-white/90' : 'text-gray-700')}`}>
                                                    {feature.title}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className={`p-10 rounded-lg min-h-[400px] border ${
                                isDarkMode 
                                    ? 'bg-white/10 border-white/20'
                                    : 'bg-white border-gray-200 shadow-sm'
                            }`}>
                                <div className="flex items-center gap-5 mb-8">
                                    <div className={isDarkMode ? 'text-white/80' : 'text-gray-600'}>{features[activeFeature].icon}</div>
                                    <h4 className={`font-light text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{features[activeFeature].title}</h4>
                                </div>
                                <p className={`text-base leading-loose ${isDarkMode ? 'text-white/85' : 'text-gray-600'}`}>{features[activeFeature].description}</p>
                            </div>
                        </div>
                    </div>
                </SmoothScrollSection>

                <SmoothScrollSection id="videos" className={`section-spacing flex items-center justify-center relative ${
                    isDarkMode 
                        ? 'bg-gray-900'
                        : 'bg-gray-50'
                }`}>
                    {/* Top gradient from previous section */}
                    <div className={`absolute inset-x-0 top-0 h-48 pointer-events-none ${
                        isDarkMode 
                            ? 'bg-gradient-to-b from-gray-900 via-gray-900/50 to-transparent' 
                            : 'bg-gradient-to-b from-white via-white/50 to-transparent'
                    }`}></div>
                    {/* Bottom gradient blending INTO next section (Content) */}
                    <div className={`absolute inset-x-0 bottom-0 h-48 pointer-events-none ${
                        isDarkMode 
                            ? 'bg-gradient-to-b from-transparent via-gray-900/50 to-gray-900' 
                            : 'bg-gradient-to-b from-transparent via-white/50 to-white'
                    }`}></div>
                    <div className="container mx-auto max-w-7xl px-6 relative z-10">
                        <div className="text-center mb-24">
                            <h2 className={`text-4xl md:text-5xl font-light mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {t('home.videos.title')}
                            </h2>
                            <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {t('home.videos.subtitle')}
                            </p>
                        </div>
                        
                        <div className="grid lg:grid-cols-2 gap-12">
                            <div className={`video-card rounded-lg overflow-hidden border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                <div className="p-8">
                                    <video 
                                        src="/assets/Videos/neuraplayintrovid1.mp4" 
                                        playsInline 
                                        controls
                                        preload="metadata"
                                        className="w-full h-full object-cover rounded" 
                                    />
                                </div>
                                <div className="px-8 pb-8">
                                    <h3 className={`text-xl font-light mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('home.videos.welcome_title')}</h3>
                                    <p className={`text-base leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('home.videos.welcome_desc')}</p>
                                </div>
                            </div>
                            
                            <div className={`video-card rounded-lg overflow-hidden border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                <div className="p-8">
                                    <video 
                                        src="/assets/Videos/Neuraplayintrovid3.mp4" 
                                        playsInline 
                                        controls
                                        preload="metadata"
                                        className="w-full h-full object-cover rounded" 
                                    />
                                </div>
                                <div className="px-8 pb-8">
                                    <h3 className={`text-xl font-light mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('home.videos.experience_title')}</h3>
                                    <p className={`text-base leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('home.videos.experience_desc')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </SmoothScrollSection>

                <SmoothScrollSection id="content" className={`content-spacing flex items-center justify-center relative ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                    {/* Top gradient from previous section */}
                    <div className={`absolute inset-x-0 top-0 h-48 pointer-events-none ${
                        isDarkMode 
                            ? 'bg-gradient-to-b from-gray-900 via-gray-900/50 to-transparent' 
                            : 'bg-gradient-to-b from-gray-50 via-gray-50/50 to-transparent'
                    }`}></div>
                    {/* Bottom gradient blending INTO next section (CTA) */}
                    <div className={`absolute inset-x-0 bottom-0 h-48 pointer-events-none ${
                        isDarkMode 
                            ? 'bg-gradient-to-b from-transparent via-gray-900/50 to-gray-900' 
                            : 'bg-gradient-to-b from-transparent via-gray-50/50 to-gray-50'
                    }`}></div>
                    <div className="container mx-auto max-w-6xl px-6 relative z-10">
                        <div className="text-center mb-20">
                            <h2 className={`text-4xl md:text-5xl font-light mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {t('home.releases.title')}
                            </h2>
                            <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {t('home.releases.subtitle')}
                            </p>
                        </div>
                        
                        <div className="grid lg:grid-cols-3 gap-10">
                            <div className={`content-card rounded-lg overflow-hidden border p-10 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-start justify-between mb-6">
                                    <h3 className={`text-xl font-light ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {t('home.releases.cube_title')}
                                    </h3>
                                    <span className={`px-3 py-1 rounded text-xs ${isDarkMode ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                                        {t('common.new')}
                                    </span>
                                </div>
                                <p className={`mb-8 leading-loose text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {t('home.releases.cube_desc')}
                                </p>
                                <Link to="/playground" className={`inline-block px-6 py-3 rounded transition-colors text-sm ${isDarkMode ? 'bg-indigo-900/50 text-indigo-200 hover:bg-indigo-900/70' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                    {t('home.releases.try_cube')}
                                </Link>
                            </div>

                            <div className={`content-card rounded-lg overflow-hidden border p-10 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-start justify-between mb-6">
                                    <h3 className={`text-xl font-light ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {t('home.releases.ai_title')}
                                    </h3>
                                    <span className={`px-3 py-1 rounded text-xs ${isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                                        {t('common.updated')}
                                    </span>
                                </div>
                                <p className={`mb-8 leading-loose text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {t('home.releases.ai_desc')}
                                </p>
                                <Link to="/ai-assistant" className={`inline-block px-6 py-3 rounded transition-colors text-sm ${isDarkMode ? 'bg-blue-900/50 text-blue-200 hover:bg-blue-900/70' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                    {t('home.releases.meet_synapse')}
                                </Link>
                            </div>

                            <div className={`content-card rounded-lg overflow-hidden border p-10 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-start justify-between mb-6">
                                    <h3 className={`text-xl font-light ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {t('home.releases.analytics_title')}
                                    </h3>
                                    <span className={`px-3 py-1 rounded text-xs ${isDarkMode ? 'bg-violet-900/30 text-violet-300' : 'bg-violet-100 text-violet-700'}`}>
                                        {t('common.enhanced')}
                                    </span>
                                </div>
                                <p className={`mb-8 leading-loose text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {t('home.releases.analytics_desc')}
                                </p>
                                <Link to="/ai-report" className={`inline-block px-6 py-3 rounded transition-colors text-sm ${isDarkMode ? 'bg-violet-900/50 text-violet-200 hover:bg-violet-900/70' : 'bg-violet-600 text-white hover:bg-violet-700'}`}>
                                    {t('home.releases.view_reports')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </SmoothScrollSection>

                <SmoothScrollSection id="cta" className={`section-spacing flex items-center justify-center relative ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                    {/* Top gradient from previous section */}
                    <div className={`absolute inset-x-0 top-0 h-48 pointer-events-none ${
                        isDarkMode 
                            ? 'bg-gradient-to-b from-gray-900 via-gray-900/50 to-transparent' 
                            : 'bg-gradient-to-b from-white via-white/50 to-transparent'
                    }`}></div>
                    {/* Bottom gradient blending INTO next section (Releases) */}
                    <div className={`absolute inset-x-0 bottom-0 h-48 pointer-events-none ${
                        isDarkMode 
                            ? 'bg-gradient-to-b from-transparent via-gray-900/50 to-gray-900' 
                            : 'bg-gradient-to-b from-transparent via-white/50 to-white'
                    }`}></div>
                    <div className="container mx-auto max-w-4xl text-center px-6 relative z-10">
                        <div className="mb-16">
                            <h2 className={`text-4xl md:text-5xl font-light mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {t('home.cta.title')}
                            </h2>
                            <p className={`text-lg max-w-2xl mx-auto leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {t('home.cta.subtitle')}
                            </p>
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-5 justify-center items-center mb-20">
                            <Link 
                                to="/registration" 
                                className={`cta-element px-10 py-4 rounded transition-all duration-300 text-base ${isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                            >
                                {t('home.cta.start_journey')}
                            </Link>
                            <Link 
                                to="/forum-registration" 
                                className={`cta-element px-10 py-4 rounded transition-all duration-300 border text-base ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                            >
                                {t('home.cta.join_community')}
                            </Link>
                        </div>
                        
                        <div className={`flex flex-col md:flex-row justify-center items-center gap-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            <div className="flex items-center gap-3">
                                <Trophy className="w-5 h-5" />
                                <span className="text-sm">{t('home.cta.proven_results')}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5" />
                                <span className="text-sm">{t('home.cta.active_users')}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <BookOpen className="w-5 h-5" />
                                <span className="text-sm">{t('home.cta.science_based')}</span>
                            </div>
                        </div>
                    </div>
                </SmoothScrollSection>

                <SmoothScrollSection id="releases" className={`section-spacing flex items-center justify-center relative ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                    {/* Smooth gradient transition from previous section */}
                    <div className={`absolute inset-x-0 top-0 h-48 pointer-events-none ${
                        isDarkMode 
                            ? 'bg-gradient-to-b from-gray-900 via-gray-900/50 to-transparent' 
                            : 'bg-gradient-to-b from-gray-50 via-gray-50/50 to-transparent'
                    }`}></div>
                    <div className="container mx-auto max-w-6xl px-6 relative z-10">
                        <div className="text-center mb-24">
                            <h2 className={`text-4xl md:text-5xl font-light mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {t('home.coming_soon.title')}
                            </h2>
                            <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {t('home.coming_soon.subtitle')}
                            </p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className={`release-card rounded-lg p-8 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                <h4 className={`text-lg font-light mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('home.coming_soon.vr_title')}</h4>
                                <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('home.coming_soon.vr_desc')}</p>
                            </div>
                            <div className={`release-card rounded-lg p-8 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                <h4 className={`text-lg font-light mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('home.coming_soon.social_title')}</h4>
                                <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('home.coming_soon.social_desc')}</p>
                            </div>
                            <div className={`release-card rounded-lg p-8 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                <h4 className={`text-lg font-light mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('home.coming_soon.adaptive_title')}</h4>
                                <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('home.coming_soon.adaptive_desc')}</p>
                            </div>
                            <div className={`release-card rounded-lg p-8 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                <h4 className={`text-lg font-light mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('home.coming_soon.parent_title')}</h4>
                                <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('home.coming_soon.parent_desc')}</p>
                            </div>
                        </div>
                    </div>
                </SmoothScrollSection>
            </main>

            <Footer />

            {/* Sign Up Choice Modal */}
            <SignUpChoiceModal
                isOpen={showSignUpModal}
                onClose={() => setShowSignUpModal(false)}
                onPremiumSignUp={() => {
                    setShowSignUpModal(false);
                    // Navigate to premium sign-up page
                    navigate('/registration');
                }}
                onRegularSignUp={() => {
                    setShowSignUpModal(false);
                    // Show regular sign-up modal
                    setShowRegularSignUpModal(true);
                }}
                onShowLogin={() => {
                    setShowSignUpModal(false);
                    setShowLoginModal(true);
                }}
            />

            {/* Regular Sign Up Modal */}
            <RegularSignUpModal
                isOpen={showRegularSignUpModal}
                onClose={() => setShowRegularSignUpModal(false)}
                onSuccess={() => {
                    console.log('Regular sign up successful!');
                }}
                onShowLogin={() => {
                    setShowRegularSignUpModal(false);
                    setShowLoginModal(true);
                }}
            />

            {/* Login Modal */}
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onSuccess={() => {
                    console.log('Login successful!');
                }}
                redirectTo="/dashboard"
            />
        </>
    );
};

export default HomePage;