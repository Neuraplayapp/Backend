import React, { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useParallax } from '../hooks/useParallax';
import MetaTags from '../seo/MetaTags';
import StructuredData from '../seo/StructuredData';
import SignUpChoiceModal from '../components/SignUpChoiceModal';
import RegularSignUpModal from '../components/RegularSignUpModal';
import LoginModal from '../components/LoginModal';
import { DEFAULT_SEO } from '../constants';

// Lazy load heavy components for code splitting
const HeroSection = lazy(() => import('../sections/HeroSection'));
const ScienceSection = lazy(() => import('../sections/ScienceSection'));
const TutorSection = lazy(() => import('../sections/TutorSection'));
const SafetySection = lazy(() => import('../sections/SafetySection'));
const HowItWorksSection = lazy(() => import('../sections/HowItWorksSection'));
const CTASection = lazy(() => import('../sections/CTASection'));

// Loading fallback component
const SectionLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
  </div>
);

/**
 * Refactored Parent Home Page with lazy loading and code splitting
 * Follows industry best practices for performance and SEO
 */
const ParentHomePage: React.FC = () => {
  const { t } = useTranslation();
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showRegularSignUpModal, setShowRegularSignUpModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const scrollY = useParallax();

  return (
    <>
      {/* SEO Meta Tags */}
      <MetaTags
        title={DEFAULT_SEO.title}
        description={DEFAULT_SEO.description}
        keywords={DEFAULT_SEO.keywords}
        ogTitle={DEFAULT_SEO.title}
        ogDescription={DEFAULT_SEO.description}
        ogImage={DEFAULT_SEO.ogImage}
        path="/"
      />

      {/* Structured Data (JSON-LD) */}
      <StructuredData type="all" />

      <div className="font-sf">
        {/* Hero Section - Above the fold, load immediately */}
        <Suspense fallback={<SectionLoader />}>
          <HeroSection
            onSignUp={() => setShowSignUpModal(true)}
            onLogin={() => setShowLoginModal(true)}
            onLearnMore={() => navigate('/about')}
            scrollY={scrollY}
          />
        </Suspense>

        {/* Science Section - Lazy loaded */}
        <Suspense fallback={<SectionLoader />}>
          <ScienceSection />
        </Suspense>

        {/* Tutor Section - Lazy loaded */}
        <Suspense fallback={<SectionLoader />}>
          <TutorSection />
        </Suspense>

        {/* Safety Section - Lazy loaded */}
        <Suspense fallback={<SectionLoader />}>
          <SafetySection />
        </Suspense>

        {/* How It Works Section - Lazy loaded */}
        <Suspense fallback={<SectionLoader />}>
          <HowItWorksSection />
        </Suspense>

        {/* CTA Section - Lazy loaded */}
        <Suspense fallback={<SectionLoader />}>
          <CTASection
            onLogin={() => setShowLoginModal(true)}
            onLearnMore={() => navigate('/about')}
          />
        </Suspense>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <ChevronDown className={`w-6 h-6 ${isDarkMode ? 'text-purple-400/60' : 'text-purple-500/60'}`} />
        </div>

        {/* Modals */}
        <SignUpChoiceModal
          isOpen={showSignUpModal}
          onClose={() => setShowSignUpModal(false)}
          onPremiumSignUp={() => {
            setShowSignUpModal(false);
            navigate('/registration');
          }}
          onRegularSignUp={() => {
            setShowSignUpModal(false);
            setShowRegularSignUpModal(true);
          }}
          onShowLogin={() => {
            setShowSignUpModal(false);
            setShowLoginModal(true);
          }}
        />

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

        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            console.log('Login successful!');
          }}
          redirectTo="/dashboard"
        />
      </div>
    </>
  );
};

export default ParentHomePage;

