import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Target, Sparkles, Star, Heart, Trophy, Zap, Users, BookOpen, Gamepad2, ChevronDown } from 'lucide-react';
import PlasmaBackground from '../components/PlasmaBackground';
import Footer from '../components/Footer';

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
    const [currentSection, setCurrentSection] = useState(0);
    const [activeFeature, setActiveFeature] = useState(0);
    const navigate = useNavigate();

    const sections = [
        { id: 'hero', title: 'Hero' },
        { id: 'features', title: 'Features' },
        { id: 'videos', title: 'Videos' },
        { id: 'content', title: 'Content' },
        { id: 'cta', title: 'Call to Action' },
        { id: 'releases', title: 'Releases' }
    ];

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
            title: 'Neuro-psychological teaching methods',
            description: 'Every game, story, and challenge is built upon proven neuropsychological principles that target specific cognitive skills. Our platform adapts to your child\'s unique learning style, ensuring optimal brain development.',
            icon: <Brain className="w-8 h-8 text-purple-600" />
        },
        {
            id: 'tailored',
            title: 'Tailor-made for the learner',
            description: 'Our adaptive AI creates personalized learning paths that evolve with your child\'s progress. Each experience is carefully crafted to match their cognitive profile and learning pace.',
            icon: <Target className="w-8 h-8 text-purple-600" />
        },
        {
            id: 'montessori',
            title: 'The Montessori approach',
            description: 'Inspired by Montessori principles, our platform encourages self-directed learning and discovery. Children explore concepts at their own pace, building confidence and independence.',
            icon: <Sparkles className="w-8 h-8 text-purple-600" />
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
            background: rgba(15, 23, 42, 0.1);
        }
        
        ::-webkit-scrollbar-thumb {
            background: linear-gradient(45deg, #8b5cf6, #3b82f6);
            border-radius: 4px;
        }
        
        .fade-in-up {
            animation: fadeInUp 0.8s ease-out forwards;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
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
                transform: translateX(-50px);
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
                transform: translateX(50px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        .parallax-bg {
            transform: translateZ(-1px) scale(2);
        }
        
        .enhanced-hover {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .enhanced-hover:hover {
            transform: translateY(-4px) scale(1.02);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        
        .gradient-text {
            background: linear-gradient(45deg, #8b5cf6, #3b82f6, #06b6d4);
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: gradientShift 3s ease infinite;
        }
        
        @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }
        
        .float {
            animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
        }
        
        .pulse-glow {
            animation: pulseGlow 2s ease-in-out infinite alternate;
        }
        
        @keyframes pulseGlow {
            from { box-shadow: 0 0 20px rgba(139, 92, 246, 0.4); }
            to { box-shadow: 0 0 40px rgba(139, 92, 246, 0.8); }
        }
        
        .hero-full-width {
            width: 100vw;
            margin-left: calc(-50vw + 50%);
            margin-right: calc(-50vw + 50%);
        }
    `;

    return (
        <>
            <style>{globalStyles}</style>
            
            <div className="fixed right-8 top-1/2 transform -translate-y-1/2 z-50 space-y-4">
                {sections.map((section, index) => (
                    <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            currentSection === index 
                                ? 'bg-purple-500 scale-125' 
                                : 'bg-white/30 hover:bg-white/50'
                        }`}
                        title={section.title}
                    />
                ))}
            </div>

            <div className="relative z-20">
                <SmoothScrollSection id="hero" className="relative flex items-center justify-center text-white overflow-hidden hero-full-width">
                <PlasmaBackground className="absolute inset-0" />
                <div className="relative z-10 text-center px-6 max-w-6xl">
                    <div className="mb-8 fade-in-up">
                        <h1 className="text-6xl md:text-8xl font-black leading-tight tracking-tighter mb-6 gradient-text">
                            Your Child is a Genius
                        </h1>
                        <p className="text-2xl md:text-3xl max-w-4xl mx-auto text-white/90 leading-relaxed">
                            Unlock the potential with scientifically-backed neuropsychological learning and games.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-5xl mx-auto">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 enhanced-hover slide-in-left" style={{animationDelay: '0.2s'}}>
                            <Zap className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
                            <h3 className="font-bold text-xl mb-2">Smart Learning</h3>
                            <p className="text-white/80">AI-powered adaptive education</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 enhanced-hover" style={{animationDelay: '0.4s'}}>
                            <Users className="w-10 h-10 text-purple-400 mx-auto mb-4" />
                            <h3 className="font-bold text-xl mb-2">Family Focused</h3>
                            <p className="text-white/80">Progress tracking for parents</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 enhanced-hover slide-in-right" style={{animationDelay: '0.6s'}}>
                            <Gamepad2 className="w-10 h-10 text-blue-400 mx-auto mb-4" />
                            <h3 className="font-bold text-xl mb-2">Fun Games</h3>
                            <p className="text-white/80">Engaging cognitive challenges</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                        <button 
                            onClick={() => navigate('/about')} 
                            className="bg-white font-bold px-8 py-4 rounded-full hover:bg-gray-100 transition-all duration-300 text-lg text-purple-600 enhanced-hover"
                        >
                            What is neuraplay?
                        </button>
                        <button 
                            onClick={() => navigate('/forum')} 
                            className="bg-white/20 backdrop-blur-sm font-bold px-8 py-4 rounded-full hover:bg-white/30 transition-all duration-300 text-lg text-white border-2 border-white/30 enhanced-hover"
                        >
                            Forum
                        </button>
                        <button 
                            onClick={() => navigate('/about')} 
                            className="bg-white/20 backdrop-blur-sm font-bold px-8 py-4 rounded-full hover:bg-white/30 transition-all duration-300 text-lg text-white border-2 border-white/30 enhanced-hover"
                        >
                            About Us
                        </button>
                    </div>
                </div>
                
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                    <ChevronDown className="w-8 h-8 text-white/70" />
                </div>
            </SmoothScrollSection>
            </div>

            <main className="main-content" style={{position: 'relative', zIndex: 20}}>
                <SmoothScrollSection id="features" className="scrolling-section bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-6">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-16">
                            <h2 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
                                An investment in their future is priceless
                            </h2>
                            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                                Give your child the tools they need to succeed in a rapidly evolving world
                            </p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div>
                                <h3 className="text-4xl font-bold text-gray-800 mb-8">A whole new way to learn</h3>
                                <div className="space-y-4">
                                    {features.map((feature, index) => (
                                        <button 
                                            key={feature.id} 
                                            onClick={() => setActiveFeature(index)} 
                                            className={`w-full p-6 rounded-2xl text-left transition-all duration-300 enhanced-hover ${
                                                activeFeature === index 
                                                    ? 'text-white shadow-xl bg-gradient-to-r from-purple-600 to-blue-600' 
                                                    : 'bg-white hover:border-2 border-purple-200 shadow-lg'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                {feature.icon}
                                                <span className="font-semibold text-lg">{feature.title}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="p-8 rounded-3xl shadow-2xl border min-h-[400px] bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 enhanced-hover">
                                <div className="flex items-center gap-4 mb-6">
                                    {features[activeFeature].icon}
                                    <h4 className="font-bold text-2xl text-purple-600">{features[activeFeature].title}</h4>
                                </div>
                                <p className="text-gray-700 text-lg leading-relaxed">{features[activeFeature].description}</p>
                            </div>
                        </div>
                    </div>
                </SmoothScrollSection>

                <SmoothScrollSection id="videos" className="scrolling-section bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
                    <div className="container mx-auto max-w-7xl">
                        <div className="text-center mb-16">
                            <h2 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
                                Discover Neuraplay
                            </h2>
                            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
                                Embark on a journey where neuroscience meets play, where every game is a step toward unlocking your child's limitless potential.
                            </p>
                        </div>
                        
                        <div className="grid lg:grid-cols-2 gap-16">
                            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden enhanced-hover">
                                <div className="p-6">
                                    <video 
                                        src="/assets/Videos/neuraplayintrovid1.mp4" 
                                        playsInline 
                                        controls
                                        preload="metadata"
                                        className="w-full h-full object-cover rounded-2xl shadow-xl" 
                                    />
                                </div>
                                <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50">
                                    <h3 className="text-3xl font-bold mb-4 text-purple-600">Welcome to Neuraplay</h3>
                                    <p className="text-lg text-gray-700 leading-relaxed">Step into a world where learning becomes an adventure. Discover how our neuroscience-based approach transforms education.</p>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden enhanced-hover">
                                <div className="p-6">
                                    <video 
                                        src="/assets/Videos/Neuraplayintrovid3.mp4" 
                                        playsInline 
                                        controls
                                        preload="metadata"
                                        className="w-full h-full object-cover rounded-2xl shadow-xl" 
                                    />
                                </div>
                                <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
                                    <h3 className="text-3xl font-bold mb-4 text-blue-600">The Neuraplay Experience</h3>
                                    <p className="text-lg text-gray-700 leading-relaxed">Witness the magic of personalized learning in action. See how our platform adapts to each child's unique cognitive profile.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </SmoothScrollSection>

                <SmoothScrollSection id="content" className="scrolling-section bg-white flex items-center justify-center p-6">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-16">
                            <h2 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
                                New Releases
                            </h2>
                            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
                                Discover our latest games and features designed to enhance cognitive development
                            </p>
                        </div>
                        
                        <div className="grid lg:grid-cols-3 gap-8">
                            <div className="rounded-3xl shadow-2xl overflow-hidden enhanced-hover bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                                <div className="p-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-2xl font-bold">🧩 The Cube</h3>
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">NEW</span>
                                    </div>
                                    <p className="text-white/90 mb-6 leading-relaxed">
                                        Advanced 3D Rubik's Cube with real-time cognitive tracking. Targets 22 neuropsychological concepts.
                                    </p>
                                    <Link to="/playground" className="inline-block bg-white font-bold px-6 py-3 rounded-full hover:bg-gray-100 transition-colors text-purple-600">
                                        Try The Cube
                                    </Link>
                                </div>
                            </div>

                            <div className="rounded-3xl shadow-2xl overflow-hidden enhanced-hover bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                                <div className="p-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-2xl font-bold">🤖 Enhanced AI</h3>
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">UPDATED</span>
                                    </div>
                                    <p className="text-white/90 mb-6 leading-relaxed">
                                        Upgraded AI assistant with voice capabilities, multi-language support, and personalized learning recommendations.
                                    </p>
                                    <Link to="/ai-assistant" className="inline-block bg-white font-bold px-6 py-3 rounded-full hover:bg-gray-100 transition-colors text-blue-600">
                                        Meet Synapse
                                    </Link>
                                </div>
                            </div>

                            <div className="rounded-3xl shadow-2xl overflow-hidden enhanced-hover bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                                <div className="p-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-2xl font-bold">📊 Analytics</h3>
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">ENHANCED</span>
                                    </div>
                                    <p className="text-white/90 mb-6 leading-relaxed">
                                        Comprehensive cognitive development tracking with detailed progress reports and performance analytics.
                                    </p>
                                    <Link to="/ai-report" className="inline-block bg-white font-bold px-6 py-3 rounded-full hover:bg-gray-100 transition-colors text-pink-600">
                                        View Reports
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </SmoothScrollSection>

                <SmoothScrollSection id="cta" className="scrolling-section bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white p-6">
                    <div className="container mx-auto max-w-6xl text-center">
                        <div className="mb-12">
                            <Star className="w-20 h-20 text-yellow-300 mx-auto mb-6 float" />
                            <h2 className="text-6xl md:text-7xl font-bold mb-8">Ready to unlock your child's potential?</h2>
                            <p className="text-2xl md:text-3xl text-white/90 max-w-4xl mx-auto mb-12 leading-relaxed">
                                Join thousands of parents who trust Neuraplay for their child's cognitive development
                            </p>
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-8 justify-center items-center mb-16">
                            <Link 
                                to="/registration" 
                                className="bg-white font-bold px-12 py-6 rounded-full hover:bg-gray-100 transition-all duration-300 text-xl text-purple-600 enhanced-hover pulse-glow"
                            >
                                Start Full Journey
                            </Link>
                            <Link 
                                to="/forum-registration" 
                                className="text-white font-bold px-12 py-6 rounded-full hover:bg-white/20 transition-all duration-300 border-2 border-white/30 text-xl bg-white/20 enhanced-hover"
                            >
                                Join Community
                            </Link>
                        </div>
                        
                        <div className="flex justify-center items-center gap-12 text-white/80">
                            <div className="flex items-center gap-3">
                                <Trophy className="w-8 h-8 text-yellow-300" />
                                <span className="text-lg">Proven Results</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Users className="w-8 h-8 text-purple-300" />
                                <span className="text-lg">10,000+ Families</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <BookOpen className="w-8 h-8 text-blue-300" />
                                <span className="text-lg">Science-Based</span>
                            </div>
                        </div>
                    </div>
                </SmoothScrollSection>

                <SmoothScrollSection id="releases" className="scrolling-section bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-white p-6">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-16">
                            <h2 className="text-5xl md:text-6xl font-bold mb-8 gradient-text">
                                🚀 Coming Soon
                            </h2>
                            <p className="text-2xl text-white/80 max-w-4xl mx-auto">
                                Exciting new features and experiences on the horizon
                            </p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="rounded-2xl p-8 border-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-400/30 enhanced-hover">
                                <h4 className="text-2xl font-bold mb-4 text-purple-300">Virtual Reality</h4>
                                <p className="text-white/70">Immersive 3D learning experiences</p>
                            </div>
                            <div className="rounded-2xl p-8 border-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-400/30 enhanced-hover">
                                <h4 className="text-2xl font-bold mb-4 text-blue-300">Social Learning</h4>
                                <p className="text-white/70">Collaborative problem-solving games</p>
                            </div>
                            <div className="rounded-2xl p-8 border-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30 enhanced-hover">
                                <h4 className="text-2xl font-bold mb-4 text-pink-300">Adaptive AI</h4>
                                <p className="text-white/70">Dynamic difficulty adjustment</p>
                            </div>
                            <div className="rounded-2xl p-8 border-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-400/30 enhanced-hover">
                                <h4 className="text-2xl font-bold mb-4 text-pink-300">Parent Portal</h4>
                                <p className="text-white/70">Comprehensive progress monitoring</p>
                            </div>
                        </div>
                    </div>
                </SmoothScrollSection>
            </main>

            <Footer />
        </>
    );
};

export default HomePage;