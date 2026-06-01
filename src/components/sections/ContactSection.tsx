'use client';

import React, { useState } from 'react';
import { Button } from '@/design-system/components/primitives/Button';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Send,
  CheckCircle,
  ArrowRight,
  Star
} from 'lucide-react';


// Critical performance override styles
const performanceOverrideStyles = `
  .contact-section-performance-override .contact-gradient-bg::before,
  .contact-section-performance-override .contact-gradient-bg::after {
    animation: none !important;
    opacity: 0.15 !important;
  }
  
  .contact-section-performance-override .contact-animate-fade-in,
  .contact-section-performance-override .contact-animate-fade-in-up,
  .contact-section-performance-override .contact-animate-scale-in {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  
  .contact-section-performance-override .contact-card-premium:hover,
  .contact-section-performance-override .icon-container-premium:hover {
    transform: none !important;
  }
  
  .contact-section-performance-override .form-glass-container {
    backdrop-filter: none !important;
  }
`;

const contactInfo = [
  {
    icon: Phone,
    title: 'Phone',
    details: '+91 98765 43210',
    subtitle: 'Mon-Fri 9am-6pm IST',
  },
  {
    icon: Mail,
    title: 'Email',
    details: 'freakingmindsdigital@gmail.com',
    subtitle: 'We reply within 24 hours',
  },
  {
    icon: MapPin,
    title: 'Office',
    details: 'India & Worldwide',
    subtitle: 'Remote & in-person',
  },
  {
    icon: Clock,
    title: 'Response Time',
    details: '< 2 hours',
    subtitle: 'Average response time',
  },
];

export function ContactSection() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    budget: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically handle the form submission
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: performanceOverrideStyles }} />
      <section className="contact-section-performance-override relative py-0 bg-gradient-to-b from-fm-neutral-50 to-fm-neutral-100 overflow-visible">
      {/* Ambient Background Pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0 contact-gradient-bg"
          style={{
            background: `radial-gradient(ellipse at 30% 20%, rgba(179,41,104,0.12) 0%, transparent 50%),
                        radial-gradient(ellipse at 70% 80%, rgba(255,107,53,0.08) 0%, transparent 50%)`
          }}
        />
        <div className="noise-overlay" />
      </div>

      <div className="relative z-10 px-4 md:px-8 lg:px-16" style={{ paddingTop: '6rem', paddingBottom: '6rem', maxWidth: '1440px', margin: '0 auto' }}>
        {/* Section Header with Perfect Alignment */}
        <div className="text-center mx-auto overflow-visible relative" style={{ marginBottom: '5rem', maxWidth: '800px' }}>
          {/* Brain mascot - friendly decoration (3D) */}
          <div className="absolute -left-20 md:-left-28 lg:-left-40 top-4 hidden md:block">
            <img
              src="/3dasset/happy-brain.webp"
              alt="Freaking Minds - Let's Talk"
              loading="lazy"
              className="w-32 lg:w-44 h-auto hover:scale-110 transition-transform duration-500 brain-animate-bounce"
              style={{ '--brain-rotate': '-10deg', mixBlendMode: 'multiply' } as React.CSSProperties}
            />
          </div>

          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-fm-magenta-50/80 backdrop-blur-sm border border-fm-magenta-200 rounded-full text-fm-magenta-700 text-sm font-medium contact-animate-fade-in badge-glow">
              <Star className="w-4 h-4 mr-2 animate-pulse-slow" />
              Get In Touch
            </div>
          </div>
          
          <h2 className="font-bold text-fm-neutral-900 contact-animate-fade-in-up text-center" 
              style={{ 
                marginBottom: '2rem', 
                lineHeight: '1.1',
                fontSize: 'clamp(2rem, 5vw, 3rem)',
                maxWidth: '100%',
                margin: '0 auto 2rem auto'
              }}>
            Ready to{' '}
            <span className="text-fm-magenta-700 relative inline-block">
              Accelerate
              <svg
                className="absolute -bottom-2 left-0 w-full h-4 text-fm-magenta-700"
                viewBox="0 0 200 12"
                fill="currentColor"
              >
                <path d="M2 8c40-6 80-6 120 0s80 6 120 0" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
            </span>{' '}
            Your Growth?
          </h2>
          
          <div className="flex justify-center">
            <p className="text-lg text-fm-neutral-600 leading-relaxed contact-animate-fade-in-up text-center" 
               style={{ maxWidth: '600px', animationDelay: '200ms' }}>
              Let&apos;s discuss your project and explore how we can help you achieve 
              remarkable results. Get a free consultation and project estimate.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Contact Information */}
          <div className="space-y-8 contact-animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <div>
              <h3 className="font-bold text-fm-neutral-900 mb-6" 
                  style={{ 
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                    lineHeight: '1.2'
                  }}>
                Let&apos;s Start a Conversation
              </h3>
              <p className="text-fm-neutral-600 leading-relaxed mb-8">
                Whether you&apos;re looking to launch a new campaign, optimize existing efforts, 
                or need strategic guidance, we&apos;re here to help turn your vision into reality.
              </p>
            </div>

            {/* Premium Contact Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {contactInfo.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <div key={item.title} className="bg-white/90 border border-fm-neutral-200 rounded-2xl p-6 contact-animate-scale-in hover:shadow-md transition-shadow duration-300" style={{ animationDelay: `${(index + 1) * 100 + 400}ms` }}>
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 icon-container-premium rounded-xl flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-6 h-6 text-fm-magenta-700" />
                      </div>
                      <div>
                        <h4 className="font-bold text-fm-neutral-900 mb-2">
                          {item.title}
                        </h4>
                        <p className="text-fm-magenta-700 font-semibold mb-1">
                          {item.details}
                        </p>
                        <p className="text-sm text-fm-neutral-600">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Enhanced Social Proof */}
            <div className="bg-gradient-to-r from-fm-magenta-50/80 to-fm-magenta-100/50 border border-fm-magenta-100 rounded-2xl p-6 contact-animate-fade-in-up" style={{ animationDelay: '800ms' }}>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i}
                      className="w-12 h-12 bg-gradient-to-br from-fm-magenta-600 to-fm-magenta-700 border-2 border-white rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg"
                    >
                      {i}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="font-bold text-fm-neutral-900 mb-1">
                    Join 250+ satisfied clients
                  </p>
                  <p className="text-sm text-fm-neutral-600">
                    Average project start: 3 business days
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Contact Form */}
          <div className="relative contact-animate-scale-in" style={{ animationDelay: '500ms' }}>
            <div className="bg-white/95 border border-fm-neutral-200 rounded-3xl p-8 shadow-lg">
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-fm-neutral-900 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="form-input-premium w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-fm-magenta-700 focus:border-transparent transition-all duration-200"
                        placeholder="John Doe"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-fm-neutral-900 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="form-input-premium w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-fm-magenta-700 focus:border-transparent transition-all duration-200"
                        placeholder="john@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-sm font-semibold text-fm-neutral-900 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="form-input-premium w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-fm-magenta-700 focus:border-transparent transition-all duration-200"
                      placeholder="Your Company"
                    />
                  </div>

                  <div>
                    <label htmlFor="budget" className="block text-sm font-semibold text-fm-neutral-900 mb-2">
                      Project Budget
                    </label>
                    <select
                      id="budget"
                      name="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      className="form-input-premium w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-fm-magenta-700 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select budget range</option>
                      <option value="25000-50000">₹25,000 - ₹50,000</option>
                      <option value="50000-100000">₹50,000 - ₹1,00,000</option>
                      <option value="100000-250000">₹1,00,000 - ₹2,50,000</option>
                      <option value="250000+">₹2,50,000+</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-fm-neutral-900 mb-2">
                      Project Details *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={4}
                      value={formData.message}
                      onChange={handleInputChange}
                      className="form-input-premium w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-fm-magenta-700 focus:border-transparent transition-all duration-200 resize-none"
                      placeholder="Tell us about your project goals, challenges, and timeline..."
                    />
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="consent"
                      required
                      className="mt-1 w-5 h-5 text-fm-magenta-700 border-fm-magenta-300 rounded focus:ring-fm-magenta-700 accent-color"
                    />
                    <label htmlFor="consent" className="text-sm text-fm-neutral-600 leading-relaxed">
                      I agree to receive communications from Freaking Minds and understand that I can unsubscribe at any time.
                    </label>
                  </div>

                  <Button type="submit" variant="primary" size="lg" className="w-full group shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105">
                    <span className="mr-2">Send Message</span>
                    <Send className="w-5 h-5 inline-block transform transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>

                  <p className="text-xs text-fm-neutral-500 text-center">
                    We typically respond within 2 hours during business hours
                  </p>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-fm-success/20 to-fm-success/10 rounded-full flex items-center justify-center mx-auto mb-6 success-icon-animate">
                    <CheckCircle className="w-10 h-10 text-fm-success" />
                  </div>
                  <h3 className="font-bold text-fm-neutral-900 mb-3" style={{ fontSize: 'clamp(1.25rem, 2vw, 1.5rem)' }}>
                    Message Sent Successfully!
                  </h3>
                  <p className="text-fm-neutral-600 mb-8 leading-relaxed">
                    Thanks for reaching out. We&apos;ll get back to you within 2 hours.
                  </p>
                  <Button variant="primary" onClick={() => setIsSubmitted(false)} className="group shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105">
                    <span className="mr-2">Send Another Message</span>
                    <ArrowRight className="w-5 h-5 inline-block transform transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </section>
    </>
  );
}