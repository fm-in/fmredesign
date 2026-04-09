'use client';

import React, { type JSX, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface SplitTextProps {
  children: string;
  type?: 'chars' | 'words' | 'lines';
  animation?: 'fadeUp' | 'fadeIn' | 'slideUp' | 'rotateIn' | 'scaleUp';
  stagger?: number;
  duration?: number;
  delay?: number;
  trigger?: 'load' | 'scroll';
  className?: string;
  as?: React.ElementType;
}

export function SplitText({
  children,
  type = 'words',
  animation = 'fadeUp',
  stagger = 0.05,
  duration = 0.8,
  delay = 0,
  trigger = 'scroll',
  className = '',
  as: Component = 'div',
}: SplitTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Split text into elements
  const splitContent = () => {
    if (type === 'chars') {
      return children.split('').map((char, i) => (
        <span
          key={i}
          className="split-char inline-block"
          style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char}
        </span>
      ));
    }

    if (type === 'words') {
      return children.split(' ').map((word, i, arr) => (
        <span key={i} className="split-word inline-block">
          {word}
          {i < arr.length - 1 && <span>&nbsp;</span>}
        </span>
      ));
    }

    // lines
    return children.split('\n').map((line, i) => (
      <span key={i} className="split-line block">
        {line}
      </span>
    ));
  };

  const getAnimationProps = () => {
    const base = {
      duration,
      stagger,
      ease: 'power3.out',
    };

    switch (animation) {
      case 'fadeUp':
        return { ...base, y: 40, opacity: 0 };
      case 'fadeIn':
        return { ...base, opacity: 0 };
      case 'slideUp':
        return { ...base, y: '100%', opacity: 0 };
      case 'rotateIn':
        return { ...base, rotationX: -90, opacity: 0, transformOrigin: 'top center' };
      case 'scaleUp':
        return { ...base, scale: 0.8, opacity: 0 };
      default:
        return { ...base, y: 40, opacity: 0 };
    }
  };

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsReady(true);
      return;
    }

    if (!containerRef.current) return;

    const elements = containerRef.current.querySelectorAll(
      `.split-${type === 'chars' ? 'char' : type === 'words' ? 'word' : 'line'}`
    );

    // Guard: skip animation if no elements found (prevents GSAP warnings)
    if (elements.length === 0) {
      setIsReady(true);
      return;
    }

    const animProps = getAnimationProps();

    const ctx = gsap.context(() => {
      if (trigger === 'scroll') {
        gsap.from(elements, {
          ...animProps,
          delay,
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
          onComplete: () => setIsReady(true),
        });
      } else {
        gsap.from(elements, {
          ...animProps,
          delay,
          onComplete: () => setIsReady(true),
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [children, type, animation, stagger, duration, delay, trigger]);

  return (
    <Component
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={`split-text-container ${className}`}
      style={{ overflow: 'hidden' }}
    >
      {splitContent()}
    </Component>
  );
}

/**
 * Reveal animation wrapper for any content
 */
interface RevealProps {
  children: React.ReactNode;
  animation?: 'fadeUp' | 'fadeIn' | 'slideLeft' | 'slideRight' | 'scaleUp' | 'rotateIn';
  duration?: number;
  delay?: number;
  stagger?: number;
  className?: string;
  trigger?: 'load' | 'scroll';
}

export function Reveal({
  children,
  animation = 'fadeUp',
  duration = 0.8,
  delay = 0,
  className = '',
  trigger = 'scroll',
}: RevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !elementRef.current) return;

    const getAnimProps = () => {
      switch (animation) {
        case 'fadeUp':
          return { y: 60, opacity: 0 };
        case 'fadeIn':
          return { opacity: 0 };
        case 'slideLeft':
          return { x: 100, opacity: 0 };
        case 'slideRight':
          return { x: -100, opacity: 0 };
        case 'scaleUp':
          return { scale: 0.8, opacity: 0 };
        case 'rotateIn':
          return { rotationY: 90, opacity: 0 };
        default:
          return { y: 60, opacity: 0 };
      }
    };

    const ctx = gsap.context(() => {
      if (trigger === 'scroll') {
        gsap.from(elementRef.current, {
          ...getAnimProps(),
          duration,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: elementRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });
      } else {
        gsap.from(elementRef.current, {
          ...getAnimProps(),
          duration,
          delay,
          ease: 'power3.out',
        });
      }
    }, elementRef);

    return () => ctx.revert();
  }, [animation, duration, delay, trigger]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
}

/**
 * Staggered children reveal
 */
interface StaggerRevealProps {
  children: React.ReactNode;
  stagger?: number;
  duration?: number;
  delay?: number;
  className?: string;
  childClassName?: string;
}

export function StaggerReveal({
  children,
  stagger = 0.1,
  duration = 0.6,
  delay = 0,
  className = '',
  childClassName = '',
}: StaggerRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !containerRef.current) return;

    const children = containerRef.current.querySelectorAll('.stagger-child');

    const ctx = gsap.context(() => {
      gsap.from(children, {
        y: 40,
        opacity: 0,
        duration,
        stagger,
        delay,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, [stagger, duration, delay]);

  return (
    <div ref={containerRef} className={className}>
      {React.Children.map(children, (child, index) => (
        <div key={index} className={`stagger-child ${childClassName}`}>
          {child}
        </div>
      ))}
    </div>
  );
}
