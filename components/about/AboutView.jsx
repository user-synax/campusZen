"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Heart,
  Globe2,
  Bot,
  ShieldCheck,
  ArrowRight,
  Github,
  GraduationCap,
} from "lucide-react";
import Footer from "@/components/landing/Footer";

const STATS = [
  { value: "2026", label: "Launched" },
  { value: "100%", label: "Student-focused" },
  { value: "India", label: "Built for" },
  { value: "AI-ready", label: "By design" },
];

const VALUES = [
  {
    icon: Heart,
    title: "For students, by students",
    body: "CampusZen is shaped by the people who use it — students building the network they always wanted, with no noise and no ads.",
  },
  {
    icon: Globe2,
    title: "Open by default",
    body: "Specs, APIs, and content are public and machine-readable. What powers the app is the same surface agents and partners use.",
  },
  {
    icon: Bot,
    title: "Built for agents",
    body: "OpenAPI, MCP, llms.txt, an A2A card, and an NLWeb /ask endpoint make CampusZen programmable from day one.",
  },
  {
    icon: ShieldCheck,
    title: "Safe & student-first",
    body: "Verification keeps the network student-only, and a calm, focused design keeps it free of spam, rage-bait, and clutter.",
  },
];

const BUILT_FOR = [
  {
    id: "students",
    label: "Students",
    title: "Built for students",
    body: "CampusZen is an exclusive network for verified Indian college students. Your feed is your campus — not the whole world — so what you see is actually relevant.",
    checks: [
      "Your campus, not the whole world",
      "Spam-free, student-only feeds",
      "Study resources that actually help",
    ],
  },
  {
    id: "communities",
    label: "Communities",
    title: "Communities that click",
    body: "Find your people by course, interest, or club. Spin up groups, post events, and keep everything your community needs in one calm place.",
    checks: [
      "Interest & course groups",
      "Events with one-tap RSVP",
      "Branded club & society pages",
    ],
  },
  {
    id: "agents",
    label: "Agents",
    title: "Open to agents",
    body: "CampusZen is programmable from day one. The public API and agent endpoints let assistants read docs, answer questions, and act for verified students.",
    checks: [
      "Public OpenAPI + MCP servers",
      "llms.txt & an A2A agent card",
      "NLWeb /ask for natural language",
    ],
  },
];

const FAQS = [
  {
    q: "Is CampusZen really only for students?",
    a: "Yes — accounts require student verification, so the network stays student-only and free of spam and bots.",
  },
  {
    q: "How is it free?",
    a: "Core features are free for every verified student. Pro adds polls, more media, and customization; colleges can license a campus plan.",
  },
  {
    q: "Can developers and agents use it?",
    a: "Yes. The public API, OpenAPI spec, MCP servers, llms.txt, and /ask are open — agents use the same verified student session.",
  },
  {
    q: "Where do I start?",
    a: "Create a free account, join your campus community, and explore events and resources. Upgrading is optional.",
  },
];

const AVATARS = [
  { initials: "AK", color: "#4ba9e1", tip: "Verified student · CSE" },
  { initials: "RP", color: "#e1674b", tip: "Verified student · Design" },
  { initials: "SK", color: "#8b5cf6", tip: "Verified student · ECE" },
  { initials: "MN", color: "#22c55e", tip: "Verified student · MBA" },
  { initials: "TI", color: "#f59e0b", tip: "Verified student · Arch" },
  { initials: "JD", color: "#ec4899", tip: "Verified student · Bio" },
];

function setDigits(group, str) {
  if (!str) return;
  group.textContent = "";
  group.dataset.value = str;
  [...str].forEach((ch, i) => {
    const span = document.createElement("span");
    span.className = "t-digit";
    if (ch === " ") span.style.width = "0.35em";
    span.textContent = ch;
    if (i % 2 === 1) span.setAttribute("data-stagger", "1");
    else if (i % 3 === 0) span.setAttribute("data-stagger", "2");
    group.appendChild(span);
  });
  requestAnimationFrame(() => group.classList.add("is-animating"));
}

function SuccessBadge() {
  const ref = useRef(null);
  useEffect(() => {
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() =>
        ref.current?.setAttribute("data-state", "in")
      );
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);
  return (
    <span className="about-success inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-1.5 text-sm font-semibold text-primary shadow-[var(--shadow-hard-sm)]">
      <span
        className="t-success-check"
        data-state="out"
        ref={ref}
        aria-hidden="true"
        style={{ ["--check-len"]: "42" }}
      >
        <svg
          viewBox="0 0 48 48"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 25 L20 35 L38 14" />
        </svg>
      </span>
      Student-verified network
    </span>
  );
}

function FaqItem({ item }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    ref.current?.setAttribute("data-open", open ? "true" : "false");
  }, [open]);

  return (
    <div className="t-acc" ref={ref} data-open="false">
      <button
        type="button"
        className="t-acc-head"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{item.q}</span>
        <span className="t-acc-chevron" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path className="t-acc-chevron-a" d="M6 9l6 6 6-6" />
            <path className="t-acc-chevron-b" d="M6 15l6-6 6 6" />
          </svg>
        </span>
      </button>
      <div className="t-acc-panel">
        <div className="t-acc-panel-inner">
          <p>{item.a}</p>
        </div>
      </div>
    </div>
  );
}

function BuiltPanel({ data }) {
  const ref = useRef(null);
  const checkRefs = useRef([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => el.setAttribute("data-open", "true"));
    });
    const timers = checkRefs.current.map((c, i) =>
      setTimeout(() => c?.setAttribute("aria-checked", "true"), 250 + i * 120)
    );
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      className="t-panel-slide about-panel"
      ref={ref}
      data-open="false"
      role="tabpanel"
    >
      <h3>{data.title}</h3>
      <p>{data.body}</p>
      <ul className="about-checks">
        {data.checks.map((c, i) => (
          <li key={c}>
            <button
              type="button"
              className="t-check"
              role="checkbox"
              aria-checked="false"
              ref={(el) => (checkRefs.current[i] = el)}
              onClick={(e) =>
                e.currentTarget.setAttribute(
                  "aria-checked",
                  e.currentTarget.getAttribute("aria-checked") === "true"
                    ? "false"
                    : "true"
                )
              }
            >
              <svg viewBox="0 0 10.1668 10.1668">
                <path d="M1 5.52L3.92 9.17L9.17 1" />
              </svg>
            </button>
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AboutView() {
  const rootRef = useRef(null);
  const tabsRef = useRef(null);
  const pillRef = useRef(null);
  const [activeBuilt, setActiveBuilt] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const cards = root.querySelectorAll(".about-card");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-in");
          obs.unobserve(e.target);
          const dg = e.target.querySelector(".t-digit-group");
          if (dg)
            setTimeout(
              () => setDigits(dg, dg.dataset.value || dg.textContent),
              120
            );
        });
      },
      { threshold: 0.15 }
    );
    cards.forEach((c) => obs.observe(c));

    const stagger = root.querySelector(".t-stagger");
    let so;
    if (stagger) {
      so = new IntersectionObserver(
        ([en]) => {
          if (en.isIntersecting) {
            stagger.classList.add("is-shown");
            so.disconnect();
          }
        },
        { threshold: 0.2 }
      );
      so.observe(stagger);
    }

    const tilts = [...root.querySelectorAll(".t-tilt")];
    const cleanups = [];
    const MAX = 9;
    tilts.forEach((wrap) => {
      const card = wrap.querySelector(".t-tilt-card");
      if (!card) return;
      const reset = () => {
        wrap.classList.remove("is-hover");
        card.classList.remove("is-tilting");
        card.style.setProperty("--tilt-rx", "0deg");
        card.style.setProperty("--tilt-ry", "0deg");
      };
      const track = (ev) => {
        if (reduce.matches) return;
        if (ev.pointerType === "touch" || ev.pointerType === "pen") return;
        const r = wrap.getBoundingClientRect();
        const px = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
        const py = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
        wrap.classList.add("is-hover");
        card.classList.add("is-tilting");
        card.style.setProperty("--tilt-ry", ((px - 0.5) * MAX).toFixed(2) + "deg");
        card.style.setProperty("--tilt-rx", ((0.5 - py) * MAX).toFixed(2) + "deg");
        card.style.setProperty("--tilt-gx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--tilt-gy", (py * 100).toFixed(1) + "%");
      };
      const onDown = (ev) => {
        if (ev.pointerType !== "mouse") {
          try {
            wrap.setPointerCapture(ev.pointerId);
          } catch (_) {}
        }
      };
      wrap.addEventListener("pointermove", track);
      wrap.addEventListener("pointerdown", onDown);
      wrap.addEventListener("pointerup", reset);
      wrap.addEventListener("pointercancel", reset);
      wrap.addEventListener("pointerleave", (ev) => {
        if (ev.pointerType === "mouse") reset();
      });
      cleanups.push(() => {
        wrap.removeEventListener("pointermove", track);
        wrap.removeEventListener("pointerdown", onDown);
        wrap.removeEventListener("pointerup", reset);
        wrap.removeEventListener("pointercancel", reset);
        wrap.removeEventListener("pointerleave", reset);
      });
    });

    let avatarCleanup = () => {};
    const avatarRoot = root.querySelector(".about-avatars .t-avatar-group");
    if (avatarRoot) {
      const avatars = [...avatarRoot.querySelectorAll(".t-avatar")];
      const cs = getComputedStyle(document.documentElement);
      const num = (n, f) => {
        const v = parseFloat(cs.getPropertyValue(n));
        return Number.isFinite(v) ? v : f;
      };
      const ease = (n, f) => cs.getPropertyValue(n).trim() || f;
      const setShifts = (activeIdx, phase) => {
        const lift = num("--avatar-lift", -4);
        const falloff = num("--avatar-falloff", 0.45);
        const scale = num("--avatar-scale", 1.05);
        const tf =
          phase === "out"
            ? ease("--avatar-ease-out", "cubic-bezier(0.34,3.85,0.64,1)")
            : ease("--avatar-ease-in", "cubic-bezier(0.22,1,0.36,1)");
        avatars.forEach((el, i) => {
          el.style.transitionTimingFunction = tf;
          if (activeIdx == null) {
            el.style.setProperty("--shift", "0px");
            el.style.setProperty("--scale-active", "1");
            return;
          }
          const d = Math.abs(i - activeIdx);
          el.style.setProperty(
            "--shift",
            (lift * Math.pow(falloff, d)).toFixed(3) + "px"
          );
          el.style.setProperty(
            "--scale-active",
            i === activeIdx ? String(scale) : "1"
          );
        });
      };
      const enter = (i) => () => setShifts(i, "in");
      avatars.forEach((el, i) =>
        el.addEventListener("mouseenter", enter(i))
      );
      avatarRoot.addEventListener("mouseleave", () => setShifts(null, "out"));
      avatarCleanup = () => {
        avatars.forEach((el, i) =>
          el.removeEventListener("mouseenter", enter(i))
        );
        avatarRoot.removeEventListener("mouseleave", () =>
          setShifts(null, "out")
        );
      };
    }

    return () => {
      obs.disconnect();
      so?.disconnect();
      cleanups.forEach((f) => f());
      avatarCleanup();
    };
  }, []);

  useEffect(() => {
    const bar = tabsRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;
    const tabs = [...bar.querySelectorAll(".t-tab")];
    const active =
      tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
    pill.style.transform = `translateX(${active.offsetLeft}px)`;
    pill.style.width = `${active.offsetWidth}px`;
  }, [activeBuilt]);

  return (
    <main ref={rootRef} className="pt-28 pb-24">
      <section className="pricing-hero relative overflow-hidden">
        <div className="pricing-glow" aria-hidden="true" />
        <div className="container mx-auto px-4 text-center">
          <span className="stats-eyebrow t-shimmer mx-auto">About CampusZen</span>
          <h1 className="about-title mt-4">
            <span className="t-stagger">
              <span className="t-stagger-line" style={{ ["--i"]: 0 }}>
                A social network
              </span>
              <span className="t-stagger-line" style={{ ["--i"]: 1 }}>
                built for students,
              </span>
              <span className="t-stagger-line" style={{ ["--i"]: 2 }}>
                open to agents.
              </span>
            </span>
          </h1>
          <p className="about-sub mx-auto mt-5">
            <span className="t-stagger">
              <span className="t-stagger-line" style={{ ["--i"]: 0 }}>
                CampusZen is a focused, student-only community for Indian
              </span>
              <span className="t-stagger-line" style={{ ["--i"]: 1 }}>
                colleges — and a fully programmable surface for the agents that
                help them.
              </span>
            </span>
          </p>
          <div className="mt-7 flex justify-center">
            <SuccessBadge />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 mt-16">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="t-tilt about-card about-stat">
              <div className="t-tilt-card card-chunky overflow-hidden">
                <span
                  className="t-digit-group stat-digits"
                  data-value={s.value}
                >
                  {s.value}
                </span>
                <span className="stat-label">{s.label}</span>
                <div className="t-tilt-glare" aria-hidden="true" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 mt-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="about-h2">What we believe</h2>
          <p className="about-lead">
            We started CampusZen because student life deserves a calmer, more
            useful home online — one that respects your attention and your
            privacy.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {VALUES.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.title} className="t-tilt about-card about-value">
                <div className="t-tilt-card card-chunky overflow-hidden">
                  <div className="value-icon">
                    <Icon size={22} strokeWidth={2.2} />
                  </div>
                  <h3 className="value-title">{v.title}</h3>
                  <p className="value-body">{v.body}</p>
                  <div className="t-tilt-glare" aria-hidden="true" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto px-4 mt-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="about-h2">Built for everyone on campus</h2>
          <p className="about-lead">
            Students, communities, and the agents that serve them — all on the
            same verified network.
          </p>
        </div>

        <div className="pricing-toggle about-tabs mt-9 flex justify-center">
          <div className="t-tabs" ref={tabsRef} role="tablist">
            <span className="t-tabs-pill" ref={pillRef} aria-hidden="true" />
            {BUILT_FOR.map((t, i) => (
              <button
                key={t.id}
                type="button"
                className="t-tab"
                role="tab"
                aria-selected={activeBuilt === i}
                onClick={() => setActiveBuilt(i)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="about-panel-wrap">
          <BuiltPanel key={activeBuilt} data={BUILT_FOR[activeBuilt]} />
        </div>
      </section>

      <section className="container mx-auto px-4 mt-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="about-h2">A network, not a crowd</h2>
          <p className="about-lead">
            Every face below is a verified student. Hover to meet a few of them.
          </p>
        </div>
        <div className="about-avatars mt-8">
          <div className="t-avatar-group">
            {AVATARS.map((a) => (
              <div className="t-avatar about-avatar" key={a.initials}>
                <span className="t-tt-wrap">
                  <span
                    className="about-avatar-chip"
                    style={{ background: a.color }}
                  >
                    {a.initials}
                  </span>
                  <span className="t-tt" role="tooltip">
                    {a.tip}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 mt-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="about-h2 text-center">Frequently asked</h2>
          <div className="about-faq mt-8">
            {FAQS.map((f) => (
              <FaqItem key={f.q} item={f} />
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 mt-20">
        <div className="about-cta card-chunky mx-auto max-w-3xl overflow-hidden text-center">
          <GraduationCap
            className="about-cta-icon mx-auto"
            size={34}
            strokeWidth={2}
          />
          <h2 className="about-h2">Ready to find your campus?</h2>
          <p className="about-lead mx-auto">
            Create a free account, join your community, and explore a calmer
            social network built for students.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="btn-chunky btn-primary">
              Get started — it&apos;s free
              <ArrowRight size={18} strokeWidth={2.4} />
            </Link>
            <span className="t-tt-wrap">
              <a
                href="https://github.com/user-synax/campusX"
                target="_blank"
                rel="noreferrer"
                className="btn-chunky"
              >
                <Github size={18} strokeWidth={2.2} />
                GitHub
              </a>
              <span className="t-tt" role="tooltip">
                View the source on GitHub
              </span>
            </span>
            <Link href="/features" className="t-learn btn-chunky">
              Explore features
              <span className="t-learn-chevron">
                <svg
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path className="t-learn-arm t-learn-arm-top" d="M6 4L10 8" />
                  <path className="t-learn-arm t-learn-arm-bot" d="M10 8L6 12" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
