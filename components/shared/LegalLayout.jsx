"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRight, Mail, ArrowUpRight } from "lucide-react";

/**
 * LegalLayout - Premium UX version.
 * Focuses on 'Space', Readability, and a working progress sidebar.
 */
export default function LegalLayout({ title, lastUpdated, sections, children }) {
  const [activeSection, setActiveSection] = useState("");
  const observer = useRef(null);

  useEffect(() => {
    // Setup Intersection Observer for TOC progress
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { 
        rootMargin: "-20% 0% -70% 0%",
        threshold: 0
      }
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.current.observe(element);
    });

    return () => observer.current?.disconnect();
  }, [sections]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 120; // Extra breathing room for the header
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#060606] text-foreground/90 font-sans selection:bg-primary/20">
      {/* 
          Main Navigation Bridge 
          Simple breadcrumb with high contrast and plenty of air.
      */}
      <div className="sticky top-16 z-40 w-full border-b border-white/5 bg-[#060606]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm font-medium">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4 text-white/20" />
            <span className="text-foreground">{title}</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
            Last Updated: {lastUpdated}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 lg:py-32">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-32 relative">
          
          {/* 
              LEFT SIDEBAR - WORKING PROGRESS 
              Features a vertical track and a floating active indicator.
          */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-48 space-y-12">
              <div className="relative pl-6">
                {/* Visual Track Line */}
                <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/5" />
                
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-8">
                  Contents
                </h3>
                
                <nav className="flex flex-col gap-6">
                  {sections.map((section) => {
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                          "group relative text-left transition-all duration-300",
                          isActive ? "translate-x-1" : "hover:translate-x-1"
                        )}
                      >
                        {/* Dynamic Active Line */}
                        {isActive && (
                          <div className="absolute -left-[25px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                        )}
                        
                        <span className={cn(
                          "block text-sm font-medium transition-colors duration-300",
                          isActive 
                            ? "text-primary" 
                            : "text-muted-foreground group-hover:text-foreground"
                        )}>
                          {section.title}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Minimalist Contact Card */}
              <div className="group p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">Need help?</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Have questions about our policies? We're here to clarify.
                  </p>
                </div>
                <Link 
                  href="mailto:usersynax@gmail.com" 
                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:opacity-80 transition-opacity uppercase tracking-wider"
                >
                  Email Developer <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </aside>

          {/* 
              MAIN CONTENT - FOCUS ON SPACE & READABILITY 
              Manual typography classes for ultimate control.
          */}
          <main className="flex-1 max-w-2xl">
            <header className="mb-24 lg:mb-32">
              <h1 className="text-5xl lg:text-7xl font-black mb-8 tracking-tighter text-white leading-[1.1]">
                {title}
              </h1>
              <div className="flex items-center gap-4">
                <div className="h-[2px] w-12 bg-primary"></div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary/60">
                  CampusZen Official Policy
                </p>
              </div>
            </header>

            {/* Custom Content Styling - Simulation of 'prose' but better */}
            <div className="space-y-24 text-[17px] md:text-[19px] leading-[1.8] text-foreground/80 font-normal">
              {children}
            </div>

            {/* Bottom spacer for scroll detection on last item */}
            <div className="h-64" />
          </main>
        </div>
      </div>
    </div>
  );
}
