import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { Twitter, Instagram, Linkedin, Github, ChevronRight, Brain } from 'lucide-react';

// Animation variants for smooth fade-in effects
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: 'easeOut',
    },
  },
};

// GSAP is globally loaded via CDN (fallback)
declare const gsap: any;
declare const ScrollTrigger: any;

const LICENSE_TEXT = `... same license text ...`;

// Static Data
const SOCIAL_LINKS = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Github, href: '#', label: 'GitHub' },
];

const FOOTER_LINKS: Record<string, { name: string; href: string; onClick?: () => void }[]> = {
  product: [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Learning Central', href: '/playground' },
  ],
  company: [
    { name: 'About', href: '/about' },
    { name: 'Careers', href: '/careers' },
  ],
  resources: [
    { name: 'Documentation', href: '/docs' },
    { name: 'Support', href: '/support' },
    { name: 'Blog', href: '/blog' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/neuraplay/license' },
    { name: 'License', href: '#', onClick: () => { } }, // will be overridden
  ],
};

// Helper for link classes
const getLinkClasses = (isDarkMode: boolean) =>
  isDarkMode ? 'text-purple-200/60 hover:text-purple-200' : 'text-slate-600 hover:text-purple-600';

const Footer: React.FC = () => {
  const [showLicense, setShowLicense] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const footerRef = useRef<HTMLElement>(null);
  const { isDarkMode } = useTheme();

  // Scroll-linked animation for smooth fade-in as user scrolls
  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ["start end", "start 0.3"]
  });

  // Transform scroll progress to opacity and y position
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [100, 0]);

  // Newsletter subscribe
  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setEmail('');
    }
  };

  // Auto-reset subscription state
  useEffect(() => {
    if (!isSubscribed) return;
    const timer = setTimeout(() => setIsSubscribed(false), 3000);
    return () => clearTimeout(timer);
  }, [isSubscribed]);

  // GSAP ScrollTrigger animation
  useEffect(() => {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    const footerElements = footerRef.current?.querySelectorAll('.footer-element');
    if (!footerElements || footerElements.length === 0) return;

    gsap.set(footerElements, { opacity: 0, y: 20 });

    const ctx = gsap.context(() => {
      gsap.fromTo(
        footerElements,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.05,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 90%',
            toggleActions: 'play none none none',
            once: true,
          },
        }
      );
    }, footerRef);

    return () => ctx.revert();
  }, []);

  // ESC key closes modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowLicense(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  // Override onClick dynamically
  const footerLinks = {
    ...FOOTER_LINKS,
    legal: FOOTER_LINKS.legal.map(link =>
      link.name === 'License' ? { ...link, onClick: () => setShowLicense(true) } : link
    ),
  };

  return (
    <motion.footer
      ref={footerRef}
      initial={{ opacity: 0, y: 80 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.02 }}
      transition={{ duration: 2.3, ease: "easeInOut" }}
      className={`relative overflow-hidden ${isDarkMode
        ? 'bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 text-white'
        : 'bg-gradient-to-b from-purple-50 via-white to-purple-50 text-slate-900'
        }`}
    >
      {/* Newsletter */}
      <div className={`py-12 md:py-16 border-b ${isDarkMode ? 'border-purple-400/10' : 'border-purple-200'}`}>
        <div className="max-w-xl mx-auto text-center px-4 sm:px-6">
          <h3 className={`text-xl sm:text-2xl md:text-3xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Stay ahead of the curve
          </h3>
          <p className={`mb-6 text-sm sm:text-base ${isDarkMode ? 'text-purple-200/60' : 'text-slate-600'}`}>
            Subscribe to our newsletter for the latest updates and insights.
          </p>
          <form
            onSubmit={handleSubscribe}
            className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center"
          >
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={`flex-1 px-4 py-3 rounded-lg outline-none transition-all duration-300 w-full sm:max-w-xs ${isDarkMode
                ? 'bg-purple-900/30 border border-purple-400/20 text-white placeholder-purple-300/50 focus:border-purple-400 focus:bg-purple-900/50'
                : 'bg-white border border-purple-200 text-slate-900 placeholder-slate-400 focus:border-purple-500 shadow-sm'
                }`}
            />
            <button
              type="submit"
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 shrink-0 ${isSubscribed
                ? 'bg-green-500 text-white'
                : 'bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-500 hover:to-purple-400 shadow-lg shadow-purple-500/25'
                }`}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          </form>
        </div>
      </div>

      {/* Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8 lg:gap-12">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <div className="footer-element mb-6 max-w-xs md:max-w-sm mx-auto md:mx-0">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg">
                <Brain className={`w-5 h-5 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`} />
              </div>
              <span className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Neuraplay</span>
            </div>
            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-purple-200/50' : 'text-slate-500'}`}>
              Empowering minds through intelligent, personalized learning experiences.
            </p>
          </div>

          <div className="flex gap-3 footer-element justify-center md:justify-start">
            {SOCIAL_LINKS.map((social, index) => (
              <a
                key={index}
                href={social.href}
                aria-label={social.label}
                className={`p-2 rounded-lg transition-all duration-200 ${isDarkMode
                  ? 'text-purple-300/50 hover:text-purple-300 hover:bg-purple-500/10'
                  : 'text-purple-400 hover:text-purple-600 hover:bg-purple-100'
                  }`}
                aria-hidden="true"
              >
                <social.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>

        {/* Footer Links */}
        {Object.entries(footerLinks).map(([category, links]) => (
          <div key={category} className="footer-element">
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 sm:mb-4 ${isDarkMode ? 'text-purple-300/50' : 'text-purple-400'}`}>
              {category}
            </h4>
            <ul className="space-y-2 sm:space-y-3">
              {links.map((link, idx) => (
                <li key={idx}>
                  {link.onClick ? (
                    <button
                      onClick={link.onClick}
                      onMouseEnter={() => setHoveredLink(`${category}-${idx}`)}
                      onMouseLeave={() => setHoveredLink(null)}
                      className={`group flex items-center gap-1 text-xs sm:text-sm transition-colors duration-200 ${getLinkClasses(isDarkMode)}`}
                    >
                      {link.name}
                      <ChevronRight className={`w-3 h-3 transition-all duration-200 ${hoveredLink === `${category}-${idx}` ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'}`} />
                    </button>
                  ) : (
                    <Link
                      to={link.href}
                      onMouseEnter={() => setHoveredLink(`${category}-${idx}`)}
                      onMouseLeave={() => setHoveredLink(null)}
                      className={`group flex items-center gap-1 text-xs sm:text-sm transition-colors duration-200 ${getLinkClasses(isDarkMode)}`}
                    >
                      {link.name}
                      <ChevronRight className={`w-3 h-3 transition-all duration-200 ${hoveredLink === `${category}-${idx}` ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'}`} />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom Bar */}
      <div className={`py-6 border-t ${isDarkMode ? 'border-purple-400/10' : 'border-purple-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className={`text-xs sm:text-sm text-center md:text-left footer-element ${isDarkMode ? 'text-purple-200/40' : 'text-slate-500'}`}>
            © 2025 Neuraplay. All rights reserved.
          </p>
          <div className={`flex items-center gap-4 sm:gap-6 text-xs sm:text-sm footer-element ${isDarkMode ? 'text-purple-200/40' : 'text-slate-500'}`}>
            <Link to="/privacy" className={`transition-colors duration-200 ${getLinkClasses(isDarkMode)}`}>Privacy</Link>
            <Link to="/neuraplay/license" className={`transition-colors duration-200 ${getLinkClasses(isDarkMode)}`}>Terms</Link>
            <span className={isDarkMode ? 'text-purple-200/40' : 'text-slate-500'}>Cookies</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showLicense && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLicense(false)}>
          <div className={`rounded-2xl p-8 max-w-2xl w-full relative ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowLicense(false)} className={`absolute top-4 right-4 text-2xl transition-colors ${isDarkMode ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}>&times;</button>
            <h2 className="text-xl font-semibold mb-4">License Agreement</h2>
            <pre className={`text-xs whitespace-pre-wrap max-h-[60vh] overflow-y-auto ${isDarkMode ? 'text-white/70' : 'text-slate-600'}`}>{LICENSE_TEXT}</pre>
          </div>
        </div>
      )}
    </motion.footer>
  );
};

export default Footer;