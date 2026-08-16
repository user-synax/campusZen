"use client";

import { useEffect, useRef } from "react";
import { FaGithub } from "react-icons/fa";
import "./footer.css";
export default function Footer() {
  const footerRef = useRef(null);

  useEffect(() => {
    if (!footerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        }
      },
      {
        threshold: 0.1,
      },
    );

    footerRef.current.style.opacity = "0";
    footerRef.current.style.transform = "translateY(20px)";
    footerRef.current.style.transition =
      "opacity 1s ease-out, transform 1s ease-out";

    observer.observe(footerRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative overflow-hidden border-t border-white/5 bg-neutral-950 text-white">
      <footer
        ref={footerRef}
        className="mx-auto w-full max-w-7xl px-6 pt-24 pb-12"
      >
        {/* Top */}
        <div className="mb-24 grid grid-cols-1 items-start gap-16 lg:grid-cols-2">
          <div className="space-y-8">
            <h2 className="font-bricolage text-5xl font-light leading-[0.9] tracking-tighter md:text-7xl">
              campusZen
              <br />
            </h2>

            <div className="flex max-w-md flex-col gap-4 sm:flex-row">
              <input
                type="email"
                placeholder="Email Address"
                className="grow rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm outline-none transition-colors focus:border-white/40"
                disabled
              />

              <button className="whitespace-nowrap rounded-full bg-gray-400 px-8 py-4 text-sm font-medium text-black disabled:opacity-50 disabled:cursor-not-allowed transition hover:bg-zinc-400">
                Comming Soon
              </button>
            </div>

            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Weekly updates on New Features, Product Improvements
              and more.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 lg:pl-12 md:grid-cols-3">
            <div className="space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-widest">
                App
              </h4>

              <ul className="space-y-4 text-sm text-neutral-400">
                <li>
                  <a href="/docs">Docs</a>
                </li>
                <li>
                  <a href="/login">Sign in</a>
                </li>
                <li>
                  <a href="/signup">Sign up</a>
                </li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-widest">
                System
              </h4>

              <ul className="space-y-4 text-sm text-neutral-400">
                <li>
                  <a href="https://wa.me/+918826343179?text=Hello%20campusZen!%20I%20want%20to%support%your%work%20and%20learn%20more%20about%20your%20products.">
                    Support
                  </a>
                </li>
                <li>
                  <a href="https://wa.me/+918826343179?text=Hello%20campusZen!%20I%20want%20to%20contact%20the%20developer.">
                    Contact Developer
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Marquee */}
        <div className="group relative mb-12 overflow-hidden border-y border-white/5 py-12">
          <div className="animate-marquee flex w-fit whitespace-nowrap">
            <span className="font-bricolage select-none px-4 text-[12vw] font-bold leading-none tracking-tighter text-white/5">
              CAMPUSZEN • CAMPUSZEN • CAMPUSZEN •
            </span>

            <span className="font-bricolage select-none px-4 text-[12vw] font-bold leading-none tracking-tighter text-white/5">
              CAMPUSZEN • CAMPUSZEN • CAMPUSZEN •
            </span>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />

              <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                System Operational
              </span>
            </div>

            <div className="hidden gap-6 text-[11px] uppercase tracking-widest text-neutral-600 md:flex">
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
              {/* <a href="/cookies">Cookies</a> */}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {[
              "ri:github-line",
            ].map((icon) => (
              <a
                key={icon}
                href="https://github.com/user-synax"
                target="_blank"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-neutral-400 transition hover:border-white/30 hover:bg-white/5 hover:text-white"
              >
                <FaGithub icon={icon} width={18} />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-12 hidden text-center md:block">
          <p className="text-[11px] uppercase tracking-[0.5em] text-neutral-700">
            &copy; {new Date().getFullYear()} campusZen. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
