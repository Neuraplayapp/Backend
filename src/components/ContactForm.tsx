import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';

interface ContactFormProps {
  variant?: 'footer' | 'about';
}

const ContactForm: React.FC<ContactFormProps> = ({ variant = 'about' }) => {
  const { isDarkMode } = useTheme();
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState('');

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setContactForm({ ...contactForm, [e.target.name]: e.target.value });
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSent(false);
    setContactError('');
    
    try {
      // Call stubbed contact API
      const result = await api.contact.submit(contactForm);
      
      if (result.success) {
        setContactSent(true);
        setTimeout(() => {
          setContactSent(false);
          setContactForm({ name: '', email: '', message: '' });
        }, 3000);
      } else {
        setContactError(result.message || 'Failed to send. Please try again later.');
      }
    } catch {
      setContactError('Failed to send. Please try again later.');
    }
  };

  if (variant === 'footer') {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-2xl p-8 max-w-2xl w-full relative min-w-[350px] rounded-2xl">
          <button onClick={() => window.location.reload()} className="absolute top-4 right-4 text-slate-200 hover:text-violet-300 text-2xl font-bold">&times;</button>
          <h2 className="text-3xl font-bold mb-6 text-violet-100 text-center drop-shadow">Contact Neuraplay</h2>
          {contactSent ? (
            <div className="text-center text-green-300 text-xl font-bold py-12">Thank you! Your message has been sent.</div>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-6 w-full max-w-lg mx-auto">
              <div>
                <label className="block font-bold mb-2 text-slate-200">Your Name</label>
                <input
                  type="text"
                  name="name"
                  value={contactForm.name}
                  onChange={handleContactChange}
                  required
                  className={`w-full p-4 rounded-xl border border-violet-300 bg-white/10 ${isDarkMode ? 'text-white' : 'text-black'} placeholder-slate-400 focus:outline-none focus:border-violet-400`}
                />
              </div>
              <div>
                <label className="block font-bold mb-2 text-slate-200">Your Email</label>
                <input
                  type="email"
                  name="email"
                  value={contactForm.email}
                  onChange={handleContactChange}
                  required
                  className={`w-full p-4 rounded-xl border border-violet-300 bg-white/10 ${isDarkMode ? 'text-white' : 'text-black'} placeholder-slate-400 focus:outline-none focus:border-violet-400`}
                />
              </div>
              <div>
                <label className="block font-bold mb-2 text-slate-200">Message</label>
                <textarea
                  name="message"
                  value={contactForm.message}
                  onChange={handleContactChange}
                  required
                  rows={5}
                  className={`w-full p-4 rounded-xl border border-violet-300 bg-white/10 ${isDarkMode ? 'text-white' : 'text-black'} placeholder-slate-400 focus:outline-none focus:border-violet-400`}
                />
              </div>
              {contactError && <div className="text-red-400 text-center font-bold">{contactError}</div>}
              <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg">Send Message</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // About page variant
  return (
    <div className="max-w-2xl mx-auto">
      {contactSent ? (
        <div className="text-center text-green-400 text-xl font-bold py-8 bg-green-900/20 rounded-xl border border-green-400/30">
          Thank you! Your message has been sent. We'll get back to you soon.
        </div>
      ) : (
        <form onSubmit={handleContactSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block font-bold mb-2 text-white">Your Name</label>
              <input
                type="text"
                name="name"
                value={contactForm.name}
                onChange={handleContactChange}
                required
                className={`w-full p-4 rounded-xl border border-violet-300 bg-white/10 ${isDarkMode ? 'text-white' : 'text-black'} placeholder-slate-400 focus:outline-none focus:border-violet-400`}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block font-bold mb-2 text-white">Your Email</label>
              <input
                type="email"
                name="email"
                value={contactForm.email}
                onChange={handleContactChange}
                required
                className={`w-full p-4 rounded-xl border border-violet-300 bg-white/10 ${isDarkMode ? 'text-white' : 'text-black'} placeholder-slate-400 focus:outline-none focus:border-violet-400`}
                placeholder="Enter your email"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold mb-2 text-white">Message</label>
            <textarea
              name="message"
              value={contactForm.message}
              onChange={handleContactChange}
              required
              rows={5}
              className={`w-full p-4 rounded-xl border border-violet-300 bg-white/10 ${isDarkMode ? 'text-white' : 'text-black'} placeholder-slate-400 focus:outline-none focus:border-violet-400`}
              placeholder="Tell us about your questions or how we can help..."
            />
          </div>
          {contactError && <div className="text-red-400 text-center font-bold bg-red-900/20 p-3 rounded-xl border border-red-400/30">{contactError}</div>}
          <div className="flex justify-center">
            <button type="submit" className="bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold px-12 py-4 rounded-full hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg">
              Send Message
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ContactForm; 