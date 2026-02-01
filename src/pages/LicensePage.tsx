import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale, Shield, FileText } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import Footer from '../components/Footer';

declare const gsap: any;

const LICENSE_TEXT = `Copyright (c) 2025 Neuraplay

This Software License Agreement ("Agreement") governs the access and use of Neuraplay ("Software"), an interactive software service developed and owned by [Your Name or Legal Entity], operating under the laws of the Republic of Kazakhstan.

By accessing, downloading, or using the Software, you ("User") agree to be bound by the terms of this Agreement.

1. LICENSE GRANT
Neuraplay grants the User a limited, non-transferable, non-exclusive, revocable license to access and use the Software strictly for personal or internal educational purposes, subject to the terms herein.

2. SUBSCRIPTION AND BILLING
Access to the Software is provided on a recurring subscription basis or through a free access tier ("Community"). Users agree to be billed monthly for paid subscriptions. Neuraplay reserves the right to adjust pricing, features, and access tiers at any time, with prior notice. Free access is granted at the sole discretion of Neuraplay.

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

AI-Generated Content is produced by automated systems and has not been reviewed by experts. Neuraplay does not guarantee its accuracy, appropriateness, or safety. Use is at the User's own risk.

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

const LicensePage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);

    // GSAP animations
    if (typeof gsap !== 'undefined' && headerRef.current && contentRef.current) {
      gsap.from(headerRef.current, {
        opacity: 0,
        y: -50,
        duration: 0.8,
        ease: 'power3.out'
      });

      gsap.from(contentRef.current, {
        opacity: 0,
        y: 30,
        duration: 1,
        delay: 0.3,
        ease: 'power3.out'
      });
    }
  }, []);

  const sections = [
    { icon: Scale, title: 'License Grant', number: '1' },
    { icon: FileText, title: 'Subscription & Billing', number: '2' },
    { icon: Shield, title: 'Restrictions', number: '3' },
  ];

  return (
    <div className={`min-h-screen ${isDarkMode 
      ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white' 
      : 'bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 text-slate-900'
    }`}>
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-purple-500 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-1/4 w-48 h-48 bg-blue-500 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-violet-500 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Header */}
        <div ref={headerRef} className="container mx-auto px-6 pt-32 pb-16 relative z-10">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 mb-8 transition-colors duration-300 ${
              isDarkMode 
                ? 'text-white/80 hover:text-violet-400' 
                : 'text-slate-600 hover:text-violet-600'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className={`p-4 rounded-2xl ${
                isDarkMode 
                  ? 'bg-violet-500/20 border border-violet-500/30' 
                  : 'bg-violet-100 border border-violet-200'
              }`}>
                <Scale className={`w-12 h-12 ${
                  isDarkMode ? 'text-violet-400' : 'text-violet-600'
                }`} />
              </div>
            </div>
            
            <h1 className={`text-5xl md:text-6xl font-bold mb-6 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Neuraplay License Agreement
            </h1>
            
            <p className={`text-xl ${
              isDarkMode ? 'text-white/70' : 'text-slate-600'
            }`}>
              Software License Agreement governing the use of Neuraplay
            </p>

            {/* Quick highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
              {sections.map((section, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-xl backdrop-blur-sm ${
                    isDarkMode
                      ? 'bg-white/5 border border-white/10'
                      : 'bg-white/80 border border-violet-100 shadow-lg'
                  }`}
                >
                  <section.icon className={`w-8 h-8 mb-3 mx-auto ${
                    isDarkMode ? 'text-violet-400' : 'text-violet-600'
                  }`} />
                  <h3 className={`font-semibold ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {section.title}
                  </h3>
                  <p className={`text-sm mt-2 ${
                    isDarkMode ? 'text-white/60' : 'text-slate-500'
                  }`}>
                    Section {section.number}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* License Content */}
      <div ref={contentRef} className="container mx-auto px-6 pb-20 relative z-10">
        <div className={`max-w-4xl mx-auto rounded-2xl p-8 md:p-12 backdrop-blur-sm ${
          isDarkMode
            ? 'bg-white/5 border border-white/10 shadow-2xl'
            : 'bg-white border border-violet-100 shadow-2xl'
        }`}>
          <div className={`prose prose-lg max-w-none ${
            isDarkMode 
              ? 'prose-invert prose-headings:text-violet-300 prose-a:text-violet-400' 
              : 'prose-slate prose-headings:text-violet-700 prose-a:text-violet-600'
          }`}>
            <pre className={`whitespace-pre-wrap font-sans leading-relaxed ${
              isDarkMode ? 'text-white/90' : 'text-slate-700'
            }`}>
              {LICENSE_TEXT}
            </pre>
          </div>

          {/* Download button */}
          <div className="mt-12 pt-8 border-t border-violet-500/20 text-center">
            <a
              href="/licenses/neuraplay.txt"
              download
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                isDarkMode
                  ? 'bg-violet-500 hover:bg-violet-600 text-white'
                  : 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              <FileText className="w-5 h-5" />
              Download as Text File
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default LicensePage;

