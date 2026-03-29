'use client';

import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, MessageCircle, ArrowRight, ChevronDown, Send, CheckCircle } from "lucide-react";
import Link from "next/link";
import { V2PageWrapper } from "@/components/layouts/V2PageWrapper";
import { CalButton } from "@/components/ui/CalButton";

const contactInfo = [
  {
    icon: MapPin,
    title: "Our Location",
    details: ["India-based, serving brands worldwide"]
  },
  {
    icon: Phone,
    title: "Call Us",
    details: ["+91 98332 57659", "Available Mon-Sat 9AM-7PM"]
  },
  {
    icon: Mail,
    title: "Email Us",
    details: ["freakingmindsdigital@gmail.com"]
  },
  {
    icon: Clock,
    title: "Office Hours",
    details: ["Monday - Friday: 9:00 AM - 7:00 PM", "Saturday: 10:00 AM - 5:00 PM", "Sunday: By Appointment"]
  }
];

const services = [
  "SEO & Digital Marketing",
  "Social Media Marketing",
  "PPC Advertising",
  "Website Design & Development",
  "Branding & Creative Design",
  "Content Marketing",
  "E-commerce Solutions",
  "Other"
];

const budgetRanges = [
  { label: "₹25,000 - ₹50,000", value: "25k_50k" },
  { label: "₹50,000 - ₹1,00,000", value: "50k_100k" },
  { label: "₹1,00,000 - ₹2,50,000", value: "100k_250k" },
  { label: "₹2,50,000+", value: "over_250k" },
  { label: "Not sure yet", value: "not_disclosed" },
];

const faqData = [
  {
    question: "How long does it take to see results from digital marketing?",
    answer: "Results vary by service, but typically you'll see initial improvements in 3-6 months for SEO, immediate results for PPC, and 1-3 months for social media marketing."
  },
  {
    question: "Do you work with businesses outside of India?",
    answer: "Yes! We work with clients across India and internationally. Our team collaborates seamlessly across time zones through digital tools."
  },
  {
    question: "What's included in your monthly reporting?",
    answer: "Our reports include key metrics, campaign performance, ROI analysis, competitor insights, and strategic recommendations for the next month."
  },
  {
    question: "Can you work with our existing marketing team?",
    answer: "Absolutely! We often collaborate with in-house teams and can provide training, consultation, or handle specific aspects of your marketing strategy."
  }
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    service: '',
    budget: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company || 'Not specified',
          projectType: formData.service ? 'digital_marketing' : 'consultation',
          projectDescription: formData.message,
          budgetRange: formData.budget || 'not_disclosed',
          timeline: 'flexible',
          primaryChallenge: formData.message,
          companySize: 'small_business',
          source: 'website_form',
        }),
      });

      if (!response.ok) throw new Error('Failed to submit');

      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', company: '', service: '', budget: '', message: '' });
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <V2PageWrapper>
      {/* Hero Section */}
      <section className="relative z-10 v2-section pt-40">
        <div className="v2-container v2-container-wide">
          <div className="max-w-4xl mx-auto" style={{ textAlign: 'center' }}>
            {/* Badge */}
            <div className="v2-badge v2-badge-glass mb-8">
              <MessageCircle className="w-4 h-4 v2-text-primary" />
              <span className="v2-text-primary">Let's Start the Conversation</span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-7xl font-bold v2-text-primary mb-8 leading-tight">
              Let's Talk About{' '}
              <span className="v2-accent">Your Growth</span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl v2-text-secondary leading-relaxed" style={{ marginBottom: '48px' }}>
              Get in touch with our team of marketing and creative experts. We're here to help you achieve your business goals with strategic marketing solutions that deliver real results.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <CalButton calLink="fm-in/15min" className="v2-btn v2-btn-primary">
                <Phone className="w-5 h-5" />
                Schedule a Call
              </CalButton>
              <Link href="#contact-form" className="v2-btn v2-btn-secondary">
                Get Instant Quote
              </Link>
            </div>
          </div>
        </div>

        {/* 3D Brain Decoration */}
        <div className="absolute left-8 lg:left-20 top-1/3 hidden lg:block" style={{ zIndex: 10 }}>
          <img
            src="/3dasset/brain-creative.png"
            alt="Creative Solutions"
            loading="lazy"
            className="h-auto animate-v2-hero-float"
            style={{
              width: 'min(180px, 30vw)',
              filter: 'drop-shadow(0 20px 40px rgba(140,25,60,0.2))',
            }}
          />
        </div>
      </section>

      {/* Contact Form & Info */}
      <section id="contact-form" className="relative z-10 v2-section">
        <div className="v2-container">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Contact Form */}
            <div className="v2-paper-lg rounded-3xl p-5 sm:p-8 lg:p-10">
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-2">
                Let's Discuss Your Project
              </h2>
              <p className="text-fm-neutral-600 mb-8">
                Fill out the form below and we'll get back to you within 24 hours with a custom proposal.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-fm-neutral-700 mb-2">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-xl transition-[border-color,box-shadow,background-color] duration-200"
                      style={{
                        padding: '14px 16px',
                        background: '#faf9f9',
                        border: '1.5px solid #e5e2e2',
                        outline: 'none',
                        fontSize: '16px',
                        color: '#0f0f0f',
                      }}
                      onFocus={(e) => { e.target.style.border = '1.5px solid #c9325d'; e.target.style.boxShadow = '0 0 0 4px rgba(201,50,93,0.08)'; e.target.style.background = '#fff'; }}
                      onBlur={(e) => { e.target.style.border = '1.5px solid #e5e2e2'; e.target.style.boxShadow = 'none'; e.target.style.background = '#faf9f9'; }}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-fm-neutral-700 mb-2">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-xl transition-[border-color,box-shadow,background-color] duration-200"
                      style={{
                        padding: '14px 16px',
                        background: '#faf9f9',
                        border: '1.5px solid #e5e2e2',
                        outline: 'none',
                        fontSize: '16px',
                        color: '#0f0f0f',
                      }}
                      onFocus={(e) => { e.target.style.border = '1.5px solid #c9325d'; e.target.style.boxShadow = '0 0 0 4px rgba(201,50,93,0.08)'; e.target.style.background = '#fff'; }}
                      onBlur={(e) => { e.target.style.border = '1.5px solid #e5e2e2'; e.target.style.boxShadow = 'none'; e.target.style.background = '#faf9f9'; }}
                      placeholder="john@company.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-fm-neutral-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-xl transition-[border-color,box-shadow,background-color] duration-200"
                      style={{
                        padding: '14px 16px',
                        background: '#faf9f9',
                        border: '1.5px solid #e5e2e2',
                        outline: 'none',
                        fontSize: '16px',
                        color: '#0f0f0f',
                      }}
                      onFocus={(e) => { e.target.style.border = '1.5px solid #c9325d'; e.target.style.boxShadow = '0 0 0 4px rgba(201,50,93,0.08)'; e.target.style.background = '#fff'; }}
                      onBlur={(e) => { e.target.style.border = '1.5px solid #e5e2e2'; e.target.style.boxShadow = 'none'; e.target.style.background = '#faf9f9'; }}
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-fm-neutral-700 mb-2">Company Name</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full rounded-xl transition-[border-color,box-shadow,background-color] duration-200"
                      style={{
                        padding: '14px 16px',
                        background: '#faf9f9',
                        border: '1.5px solid #e5e2e2',
                        outline: 'none',
                        fontSize: '16px',
                        color: '#0f0f0f',
                      }}
                      onFocus={(e) => { e.target.style.border = '1.5px solid #c9325d'; e.target.style.boxShadow = '0 0 0 4px rgba(201,50,93,0.08)'; e.target.style.background = '#fff'; }}
                      onBlur={(e) => { e.target.style.border = '1.5px solid #e5e2e2'; e.target.style.boxShadow = 'none'; e.target.style.background = '#faf9f9'; }}
                      placeholder="Your Company"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-fm-neutral-700 mb-2">Service Required *</label>
                    <select
                      required
                      value={formData.service}
                      onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                      className="w-full rounded-xl transition-[border-color,box-shadow,background-color] duration-200 cursor-pointer"
                      style={{
                        padding: '14px 16px',
                        background: '#faf9f9',
                        border: '1.5px solid #e5e2e2',
                        outline: 'none',
                        fontSize: '16px',
                        color: '#0f0f0f',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 16px center',
                        paddingRight: '44px',
                      }}
                      onFocus={(e) => { e.target.style.border = '1.5px solid #c9325d'; e.target.style.boxShadow = '0 0 0 4px rgba(201,50,93,0.08)'; e.target.style.background = '#fff'; }}
                      onBlur={(e) => { e.target.style.border = '1.5px solid #e5e2e2'; e.target.style.boxShadow = 'none'; e.target.style.background = '#faf9f9'; }}
                    >
                      <option value="">Select a service</option>
                      {services.map((service) => (
                        <option key={service} value={service}>{service}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-fm-neutral-700 mb-2">Budget Range</label>
                    <select
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="w-full rounded-xl transition-[border-color,box-shadow,background-color] duration-200 cursor-pointer"
                      style={{
                        padding: '14px 16px',
                        background: '#faf9f9',
                        border: '1.5px solid #e5e2e2',
                        outline: 'none',
                        fontSize: '16px',
                        color: '#0f0f0f',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 16px center',
                        paddingRight: '44px',
                      }}
                      onFocus={(e) => { e.target.style.border = '1.5px solid #c9325d'; e.target.style.boxShadow = '0 0 0 4px rgba(201,50,93,0.08)'; e.target.style.background = '#fff'; }}
                      onBlur={(e) => { e.target.style.border = '1.5px solid #e5e2e2'; e.target.style.boxShadow = 'none'; e.target.style.background = '#faf9f9'; }}
                    >
                      <option value="">Select budget range</option>
                      {budgetRanges.map((budget) => (
                        <option key={budget.value} value={budget.value}>{budget.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-fm-neutral-700 mb-2">Project Details *</label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={6}
                    className="w-full rounded-xl transition-[border-color,box-shadow,background-color] duration-200"
                    style={{
                      padding: '14px 16px',
                      background: '#faf9f9',
                      border: '1.5px solid #e5e2e2',
                      outline: 'none',
                      fontSize: '16px',
                      color: '#0f0f0f',
                      resize: 'none',
                    }}
                    onFocus={(e) => { e.target.style.border = '1.5px solid #c9325d'; e.target.style.boxShadow = '0 0 0 4px rgba(201,50,93,0.08)'; e.target.style.background = '#fff'; }}
                    onBlur={(e) => { e.target.style.border = '1.5px solid #e5e2e2'; e.target.style.boxShadow = 'none'; e.target.style.background = '#faf9f9'; }}
                    placeholder="Tell us about your project..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || submitStatus === 'success'}
                  className="v2-btn v2-btn-magenta v2-btn-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>

                {submitStatus === 'success' && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <p className="text-green-800 text-sm font-medium">
                      Thank you for your inquiry! We'll get back to you within 24 hours.
                    </p>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <Send className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-red-800 text-sm font-medium">
                      Something went wrong. Please try again or email us directly at freakingmindsdigital@gmail.com
                    </p>
                  </div>
                )}
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              <div className="v2-paper rounded-2xl p-8">
                <h3 className="font-display text-xl font-bold text-fm-neutral-900 mb-6">Get in Touch</h3>
                <p className="text-fm-neutral-600 mb-8">
                  Prefer to speak directly? Our team is available through multiple channels.
                </p>

                <div className="space-y-6">
                  {contactInfo.map((info) => {
                    const Icon = info.icon;
                    return (
                      <div key={info.title} className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-fm-magenta-50 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-fm-magenta-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-fm-neutral-900 mb-1">{info.title}</h4>
                          {info.details.map((detail, idx) => (
                            <p key={idx} className="text-fm-neutral-600 text-sm">{detail}</p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="v2-paper rounded-2xl p-8">
                <h3 className="font-display text-xl font-bold text-fm-neutral-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <a
                    href="tel:+919833257659"
                    className="v2-btn v2-btn-magenta v2-btn-full"
                  >
                    <Phone className="w-5 h-5" />
                    Call Now
                  </a>
                  <a
                    href="mailto:freakingmindsdigital@gmail.com"
                    className="v2-btn v2-btn-outline v2-btn-full"
                  >
                    <Mail className="w-5 h-5" />
                    Send Email
                  </a>
                  <a
                    href="https://wa.me/919833257659"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="v2-btn v2-btn-outline v2-btn-full"
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="relative z-10 v2-section">
        <div className="v2-container">
          <div className="max-w-2xl mx-auto" style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 className="font-display text-3xl md:text-4xl font-bold v2-text-primary mb-6 leading-tight">
              Find <span className="v2-accent">Us</span>
            </h2>
            <p className="v2-text-secondary">
              Based in Central India, we serve brands across the country and worldwide.
            </p>
          </div>

          <div className="v2-paper rounded-2xl overflow-hidden aspect-[4/3] md:aspect-video">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3665.9740851406573!2d77.39836927554988!3d23.2440300790192!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x397c434b09a56f8d%3A0xb51d32849457f0e6!2sFreaking%20Minds!5e0!3m2!1sen!2sin!4v1770984668410!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="FreakingMinds Office Location - India"
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 v2-section pb-32">
        <div className="v2-container v2-container-narrow">
          <div className="max-w-2xl mx-auto" style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 className="font-display text-3xl md:text-4xl font-bold v2-text-primary leading-tight">
              Frequently Asked <span className="v2-accent">Questions</span>
            </h2>
          </div>

          <div className="space-y-4">
            {faqData.map((faq, index) => (
              <div key={index} className="v2-paper-sm rounded-xl overflow-hidden">
                <button
                  onClick={() => setActiveAccordion(activeAccordion === index ? null : index)}
                  className="w-full px-4 sm:px-6 py-4 flex items-center justify-between text-left"
                >
                  <span className="font-semibold text-fm-neutral-900 pr-2 sm:pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-fm-neutral-400 transition-transform ${
                      activeAccordion === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {activeAccordion === index && (
                  <div className="px-6 pb-4">
                    <p className="text-fm-neutral-600 text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

    </V2PageWrapper>
  );
}
