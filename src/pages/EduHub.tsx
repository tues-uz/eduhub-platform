import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BookOpen, Users, Award, TrendingUp, Globe, BarChart3, GraduationCap, Lightbulb, Target, Zap, Heart, ChevronUp, ArrowRight, Linkedin, Check, Star } from "@/lib/icons";
import { cn } from "@/lib/utils";
import EduHubHeader from "@/components/EduHubHeader";
import Footer from "@/components/Footer";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    title: "Online Classes",
    description: "Access comprehensive classes from anywhere, anytime",
    image: "https://picsum.photos/seed/online-learning/600/450",
    imageAlt: "Online learning",
  },
  {
    title: "Expert Instructors",
    description: "Learn from industry professionals and academic experts",
    image: "https://picsum.photos/seed/expert-instructor/600/450",
    imageAlt: "Expert instructor",
  },
  {
    title: "Certifications",
    description: "Earn recognized certificates upon class completion",
    image: "https://picsum.photos/seed/certification/600/450",
    imageAlt: "Certificate",
  },
  {
    title: "Career Growth",
    description: "Advance your career with in-demand skills",
    image: "https://picsum.photos/seed/career/600/450",
    imageAlt: "Career growth",
  },
  {
    title: "Global Access",
    description: "Connect with learners from around the world",
    image: "https://picsum.photos/seed/global/600/450",
    imageAlt: "Global learning",
  },
  {
    title: "Analytics Dashboard",
    description: "Track your progress and performance metrics",
    image: "https://picsum.photos/seed/analytics/600/450",
    imageAlt: "Analytics dashboard",
  },
];

const stats = [
  { icon: GraduationCap, value: "50,000+", label: "Students", color: "text-blue-500", bento: "wide" as const },
  { icon: BookOpen, value: "500+", label: "Classes", color: "text-purple-500", bento: "normal" as const },
  { icon: Users, value: "200+", label: "Teachers", color: "text-green-500", bento: "normal" as const },
  { icon: Award, value: "95%", label: "Completion Rate", color: "text-orange-500", bento: "accent" as const },
  { icon: Target, value: "10+", label: "Years of Excellence", color: "text-amber-600", bento: "normal" as const },
];

const highlights = [
  {
    icon: Lightbulb,
    title: "Interactive Learning",
    description: "Engage with multimedia content, quizzes, and hands-on projects",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Target,
    title: "Goal-Oriented",
    description: "Set and achieve your learning objectives with personalized paths",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    icon: Zap,
    title: "Fast Track",
    description: "Accelerate your learning with intensive programs",
    gradient: "from-yellow-500 to-amber-500",
  },
  {
    icon: Heart,
    title: "Community Support",
    description: "Join a vibrant community of learners and mentors",
    gradient: "from-red-500 to-pink-500",
  },
];

const teamMembers = [
  { name: "Buriyeva Shakhnoza", nameLine1: "Buriyeva", nameLine2: "Shakhnoza", role: "EDUHUB Director", roleLine1: "EDUHUB", roleLine2: "Director", image: "/eduhub/1.png" },
  { name: "Indiana Ayu Alwasilah", nameLine1: "Indiana Ayu", nameLine2: "Alwasilah", role: "Co-Executive Director", roleLine1: "Co-Executive", roleLine2: "Director", image: "/eduhub/2.png" },
  { name: "Riyadi Maulaya", nameLine1: "Riyadi", nameLine2: "Maulaya", role: "Co-Executive Director", roleLine1: "Co-Executive", roleLine2: "Director", image: "/eduhub/3.png" },
  { name: "Saidakhmedova Dilfuzakhon", nameLine1: "Saidakhmedova", nameLine2: "Dilfuzakhon", role: "Organizational Excellence Manager", roleLine1: "Organizational Excellence", roleLine2: "Manager", image: "/eduhub/4.png" },
  { name: "Abdurazakova Samira", nameLine1: "Abdurazakova", nameLine2: "Samira", role: "Learning Experience Manager", roleLine1: "Learning Experience", roleLine2: "Manager", image: "/eduhub/5.png" },
  { name: "Jurakulova Yulduz", nameLine1: "Jurakulova", nameLine2: "Yulduz", role: "Call Operator", roleLine1: "Call", roleLine2: "Operator", image: "/eduhub/6.png" },
  { name: "Tursunova Yuliroz", nameLine1: "Tursunova", nameLine2: "Yuliroz", role: "Administrative Navigator", roleLine1: "Administrative", roleLine2: "Navigator", image: "/eduhub/7.png" },
  { name: "Amirov Jamshid", nameLine1: "Amirov", nameLine2: "Jamshid", role: "Call Operator", roleLine1: "Call", roleLine2: "Operator", image: "/eduhub/8.png" },
];

const studentReviews = [
  {
    name: "Aziza Karimova",
    course: "Business English",
    rating: 5,
    quote:
      "Every class felt practical, not textbook-heavy. My speaking confidence improved within the first month.",
  },
  {
    name: "Jasur Toshmatov",
    course: "Introduction to Economics",
    rating: 5,
    quote:
      "Clear explanations and real examples. Instructors actually answer questions — economics finally clicked for me.",
  },
  {
    name: "Madina Rakhimova",
    course: "Digital Marketing Essentials",
    featured: true,
    rating: 5,
    quote:
      "The projects were hands-on and relevant. I used what I learned in class the same week for a freelance client pitch.",
  },
  {
    name: "Bobur Nazarov",
    course: "Financial Accounting",
    rating: 4,
    quote:
      "Structured lessons and helpful feedback. The online format was smooth — I never felt lost between sessions.",
  },
  {
    name: "Nilufar Yusupova",
    course: "English for Business",
    rating: 5,
    quote:
      "Small-group discussions and patient teachers. I can write reports and join meetings in English comfortably now.",
  },
  {
    name: "Sardor Alimov",
    course: "Data Analysis with Excel",
    rating: 5,
    quote:
      "From basics to dashboards, step by step. I finished with skills I could show on my CV right away.",
  },
] as const;

function reviewIndexLabel(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function ReviewStars({
  rating,
  size = "sm",
  className,
}: {
  rating: number;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={cn(
            size === "md" ? "h-4 w-4" : "h-3 w-3",
            index < rating ? "fill-amber-400 text-amber-400" : "text-gray-300",
          )}
          strokeWidth={index < rating ? 0 : 1.5}
          aria-hidden
        />
      ))}
    </div>
  );
}

const EduHub = () => {
  const words = ["Excellence", "Success", "Innovation", "Growth", "Knowledge"];
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [visionTab, setVisionTab] = useState<"mission" | "vision" | "values">("mission");
  const featuredReview = studentReviews.find((review) => "featured" in review && review.featured) ?? studentReviews[0];
  const supportingReviews = studentReviews.filter((review) => review !== featuredReview);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 200);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ease = "power3.out";
    const ctx = gsap.context(() => {
      // —— All sections: smooth fade-up when entering viewport ——
      const sectionReveals = root.querySelectorAll(".section-reveal");
      sectionReveals.forEach((el) => {
        gsap.set(el, { opacity: 0, y: 40 });
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease,
          scrollTrigger: {
            trigger: el,
            start: "top 82%",
            toggleActions: "play none none none",
          },
        });
      });

      // —— Hero: 4 image cards stagger ——
      const heroCards = root.querySelectorAll(".hero-card-item");
      if (heroCards.length) {
        gsap.set(heroCards, { opacity: 0, y: 56 });
        const heroGrid = root.querySelector(".hero-cards-reveal");
        gsap.to(heroCards, {
          opacity: 1,
          y: 0,
          duration: 0.85,
          stagger: 0.1,
          ease,
          scrollTrigger: {
            trigger: heroGrid ?? heroCards[0],
            start: "top 88%",
            toggleActions: "play none none none",
          },
        });
      }

      // —— Vision & Mission: image slides in from left ——
      const visionLeft = root.querySelector(".vision-reveal-left");
      if (visionLeft) {
        gsap.set(visionLeft, { opacity: 0, x: -80 });
        gsap.to(visionLeft, {
          opacity: 1,
          x: 0,
          duration: 1,
          ease,
          scrollTrigger: {
            trigger: visionLeft,
            start: "top 82%",
            toggleActions: "play none none none",
          },
        });
      }

      // —— Vision & Mission: content (tabs + text) slides in from right ——
      const visionRight = root.querySelector(".vision-reveal-right");
      if (visionRight) {
        gsap.set(visionRight, { opacity: 0, x: 80 });
        gsap.to(visionRight, {
          opacity: 1,
          x: 0,
          duration: 1,
          ease,
          scrollTrigger: {
            trigger: visionRight,
            start: "top 82%",
            toggleActions: "play none none none",
          },
        });
      }

      // —— Team cards: fade up with stagger ——
      const teamCards = root.querySelectorAll(".team-card-reveal");
      if (teamCards.length) {
        gsap.set(teamCards, { opacity: 0, y: 44 });
        const triggerEl = teamCards[0].parentElement ?? teamCards[0];
        gsap.to(teamCards, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.06,
          ease,
          scrollTrigger: {
            trigger: triggerEl,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        });
      }

      // —— Student reviews: fade up with stagger ——
      const reviewCards = root.querySelectorAll(".review-card-reveal");
      if (reviewCards.length) {
        gsap.set(reviewCards, { opacity: 0, y: 36 });
        const triggerEl = reviewCards[0].parentElement ?? reviewCards[0];
        gsap.to(reviewCards, {
          opacity: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.08,
          ease,
          scrollTrigger: {
            trigger: triggerEl,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        });
      }

      // —— Stats bento grid: stagger cards ——
      const statsCards = root.querySelectorAll(".stats-card");
      if (statsCards.length) {
        gsap.set(statsCards, { opacity: 0, y: 36 });
        const statsGrid = root.querySelector(".stats-cards-grid");
        gsap.to(statsCards, {
          opacity: 1,
          y: 0,
          duration: 0.75,
          stagger: 0.1,
          ease,
          scrollTrigger: {
            trigger: statsGrid ?? statsCards[0],
            start: "top 82%",
            toggleActions: "play none none none",
          },
        });
      }

    }, root);

    return () => ctx.revert();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div ref={rootRef} className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <EduHubHeader />
      
      {/* Hero Section */}
      <section className="relative pt-0 pb-24 overflow-hidden bg-white">
        <div className="section-reveal container mx-auto px-6 pt-[200px] relative z-10">
          <div className="flex flex-col gap-16">
            {/* Content - Framer-style: badge, heading, text, CTA */}
            <div className="max-w-4xl relative w-full mx-auto text-center">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 rounded-[32px] px-4 py-1.5 mb-6" style={{ backgroundColor: 'rgb(240, 244, 243)' }}>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full opacity-90" style={{ backgroundColor: 'rgb(94, 107, 100)', transform: 'scale(1.9)' }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: 'rgb(19, 38, 27)' }} />
                </span>
                <span className="text-sm font-medium" style={{ color: 'rgb(19, 38, 27)' }}>Quality language education</span>
              </div>
              {/* Heading */}
              <div className="mb-4">
                <h1 className="font-extrabold text-foreground tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '80px', lineHeight: '80%' }}>
                  Your Gateway to
                  <br />
                  <span className="block relative overflow-hidden" style={{ height: '1.2em', minWidth: '300px', display: 'inline-block' }}>
                    <span 
                      className="block bg-gradient-to-r from-[#3954d0] to-[#199eff] bg-clip-text text-transparent"
                      style={{ 
                        lineHeight: '1.2em',
                        animation: `slideUp ${words.length * 4}s linear infinite`,
                        willChange: 'transform',
                      }}
                    >
                      {[...words, ...words].map((word, index) => (
                        <span key={index} className="block" style={{ height: '1.2em' }}>
                          {word}
                        </span>
                      ))}
                    </span>
                  </span>
                </h1>
              </div>
              {/* Description */}
              <p className="max-w-4xl mx-auto mb-8 leading-relaxed" style={{ color: 'rgb(82, 94, 88)', fontSize: '16px' }}>
                EDUHUB is an educational center working under TISU, a leading private university in Uzbekistan.
                <br />
                It offers modern, high-quality language education using international standards.
              </p>
              {/* CTA - dark green, arrow */}
              <div className="flex flex-wrap justify-center">
                <button
                  className="inline-flex items-center gap-2 px-6 py-4 text-white rounded-[37px] font-semibold transition-all duration-300 hover:opacity-95 shadow-lg"
                  style={{ backgroundColor: '#3954d0' }}
                >
                  <span>Learn More</span>
                  <ArrowRight className="h-5 w-5 flex-shrink-0" />
                </button>
              </div>
            </div>

            {/* People Cards - scroll reveal */}
            <div
              className="hero-cards-reveal grid grid-cols-4 gap-4 w-full max-w-7xl mx-auto"
              style={{ height: '380px' }}
            >
              <div className="hero-card-item relative rounded-[16px] transition-all duration-300 bg-contain bg-bottom bg-no-repeat" style={{ backgroundImage: 'url(/edu1.png)', backgroundColor: '#E5E7EB', height: '100%' }} />
              <div className="hero-card-item relative rounded-[16px] transition-all duration-300 bg-contain bg-bottom bg-no-repeat" style={{ backgroundImage: 'url(/edu2.png)', backgroundColor: '#E5E7EB', height: '100%' }} />
              <div className="hero-card-item relative rounded-[16px] transition-all duration-300 bg-contain bg-bottom bg-no-repeat" style={{ backgroundImage: 'url(/edu3.png)', backgroundColor: '#E5E7EB', height: '100%' }} />
              <div className="hero-card-item relative rounded-[16px] transition-all duration-300 bg-contain bg-bottom bg-no-repeat" style={{ backgroundImage: 'url(/edu4.png)', backgroundColor: '#E5E7EB', height: '100%' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Section - right below hero (Framer Logos style) */}
      <section className="py-24 bg-white relative">
        <div className="section-reveal container mx-auto px-6">
          {/* Tagline + heading */}
          <div className="text-center mb-12">
            <h2 className="text-lg lg:text-xl font-bold text-foreground mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Our Valuable Partners
            </h2>
          </div>

          {/* Logo ticker - mask fade on edges, 64px gap */}
          <div
            className="flex w-full items-center overflow-hidden"
            style={{
              maskImage: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 10%, rgb(0, 0, 0) 90%, rgba(0, 0, 0, 0) 100%)',
              WebkitMaskImage: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 10%, rgb(0, 0, 0) 90%, rgba(0, 0, 0, 0) 100%)',
            }}
          >
            <ul className="flex items-center gap-4 list-none m-0 p-0 animate-scroll w-max">
              {[1, 2, 3].map((set) =>
                [
                  { name: "Partner 1", logo: "/partnership/1.png" },
                  { name: "Partner 2", logo: "/partnership/2.png" },
                  { name: "Partner 3", logo: "/partnership/3.png" },
                  { name: "Partner 4", logo: "/partnership/4.png" },
                ].map((partner, index) => (
                  <li key={`set-${set}-${index}`} className="flex-shrink-0">
                    <div className="flex items-center justify-center p-4 transition-all duration-300 hover:opacity-80" style={{ minWidth: '120px' }}>
                      <img
                        src={partner.logo}
                        alt={partner.name}
                        className="max-w-[100px] h-12 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent && !parent.querySelector('.fallback-text')) {
                            const fallback = document.createElement('div');
                            fallback.className = 'fallback-text text-foreground/70 font-semibold';
                            fallback.textContent = partner.name;
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Stats Section - Framer Bento-style grid (wide + subgrid) */}
      <section className="pt-16 pb-[160px] px-6 lg:px-16 bg-white relative">
        <div className="section-reveal container mx-auto px-6">
          {/* Heading - Framer style: tagline pill + h2 */}
          <div className="mb-8 lg:mb-10 text-center">
            <div
              className="inline-flex items-center gap-2 rounded-[32px] px-4 py-1.5 mb-4"
              style={{ backgroundColor: "rgb(240, 244, 243)" }}
            >
              <span className="text-sm font-medium" style={{ color: "rgb(19, 38, 27)" }}>
                Why Choose Us
              </span>
            </div>
            <h2
              className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight tracking-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Why you should<br />join with us?
            </h2>
          </div>
          <div
            className="stats-cards-grid grid gap-4 max-w-5xl mx-auto"
            style={{
              gridTemplateColumns: "1fr",
              gridTemplateRows: "auto",
            }}
          >
            {/* Row 1: wide card (2 cols) + one card — lg and up */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Wide card - 50,000+ Students (blue-500 like scroll-to-top button) */}
              <div
                className="stats-card rounded-[16px] min-h-[200px] lg:min-h-[260px] flex flex-col justify-center transition-all duration-300 lg:col-span-2 bg-blue-500"
              >
                <div className="p-6 lg:p-8 flex flex-col justify-center h-full">
                  <div className="text-4xl lg:text-5xl xl:text-[72px] font-bold leading-none mb-2 text-white">
                    {stats[0].value}
                  </div>
                  <h3 className="text-base font-semibold text-white/90" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {stats[0].label}
                  </h3>
                </div>
              </div>
              {/* Card 2 - 500+ Classes (Framer-style: title + pills for movement animation) */}
              <div
                className="stats-card rounded-[16px] min-h-[200px] lg:min-h-[260px] flex flex-col transition-all duration-300 overflow-visible"
                style={{ backgroundColor: "rgb(242, 241, 241)" }}
              >
                <div className="flex flex-col flex-1">
                  <h4
                    className="text-center text-[32px] font-bold mb-3 flex-shrink-0 px-5 lg:px-6 pt-5 lg:pt-6"
                    style={{ color: "rgb(38, 41, 46)", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    500+ Classes
                  </h4>
                  <div className="flex flex-col gap-2 flex-1 justify-center min-h-0 overflow-hidden">
                    {/* Row 1 - marquee right-to-left, looped */}
                    <div className="overflow-hidden">
                      <div
                        className="flex items-center gap-2 flex-nowrap w-max"
                        style={{
                          animation: "marquee-r2l 25s linear infinite",
                        }}
                      >
                        {[...Array(8)].map((_, copy) =>
                          ["Language", "Business", "Tech", "Arts", "Science"].map((tag) => (
                            <span
                              key={`r1-${copy}-${tag}`}
                              className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap flex-shrink-0"
                              style={{ backgroundColor: "rgb(255, 255, 255)", color: "rgb(38, 41, 46)" }}
                            >
                              {tag}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    {/* Row 2 - marquee left-to-right, looped */}
                    <div className="overflow-hidden">
                      <div
                        className="flex items-center gap-2 flex-nowrap w-max"
                        style={{
                          animation: "marquee-l2r 25s linear infinite",
                        }}
                      >
                        {[...Array(8)].map((_, copy) =>
                          ["Math", "Science", "Language", "Business", "Tech"].map((tag, i) => (
                            <span
                              key={`r2-${copy}-${i}-${tag}`}
                              className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap flex-shrink-0"
                              style={{ backgroundColor: "rgb(255, 255, 255)", color: "rgb(38, 41, 46)" }}
                            >
                              {tag}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    {/* Row 3 - copy of Row 1 (right-to-left), placed below Row 2 */}
                    <div className="overflow-hidden">
                      <div
                        className="flex items-center gap-2 flex-nowrap w-max"
                        style={{
                          animation: "marquee-r2l 25s linear infinite",
                        }}
                      >
                        {[...Array(8)].map((_, copy) =>
                          ["Language", "Business", "Tech", "Arts", "Science"].map((tag) => (
                            <span
                              key={`r3a-${copy}-${tag}`}
                              className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap flex-shrink-0"
                              style={{ backgroundColor: "rgb(255, 255, 255)", color: "rgb(38, 41, 46)" }}
                            >
                              {tag}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <p
                    className="text-center text-sm font-medium mt-2 flex-shrink-0 px-5 lg:px-6 pb-5 lg:pb-6"
                    style={{ color: "rgb(102, 112, 122)", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Wide variety
                  </p>
                </div>
              </div>
            </div>
            {/* Row 2: subgrid — 3 equal cards (200+ Teachers, 95% Completion, 10+ Years) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.slice(2, 5).map((stat) => {
                const isAccent = stat.bento === "accent";
                return (
                  <div
                    key={stat.label}
                    className="stats-card rounded-[16px] min-h-[200px] lg:min-h-[240px] flex flex-col justify-center transition-all duration-300"
                    style={{
                      backgroundColor: isAccent ? "rgb(255, 190, 60)" : "rgb(242, 241, 241)",
                    }}
                  >
                    <div className="p-6 lg:p-8 flex flex-col justify-center h-full text-center">
                      <div
                        className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-none mb-2"
                        style={{ color: "rgb(38, 41, 46)" }}
                      >
                        {stat.value}
                      </div>
                      <h3
                        className="text-sm font-semibold"
                        style={{ color: isAccent ? "rgb(38, 41, 46)" : "rgb(102, 112, 122)", fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {stat.label}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Meet Our Team Section - Framer layout: badge, title, white cards with image + info + LinkedIn */}
      <section className="py-20 bg-gray-50 relative">
        <div className="section-reveal container mx-auto px-6">
          {/* Heading Block - Framer style: Badge and Title side by side */}
          <div className="mb-12">
            <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
              <div className="flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-16 text-left w-full max-w-7xl mx-auto">
                <h2
                  className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight flex-shrink-0"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(3, 2, 11)" }}
                >
                  Meet the Team
                <br />
                Behind Your Learning
                </h2>
                <p className="text-base leading-relaxed max-w-2xl lg:ml-auto lg:text-right" style={{ color: "rgb(88, 88, 102)" }}>
                  Professional & experienced teachers & staffs
                  <br />
                  with master&apos;s degree & international certificates
                </p>
              </div>
            </div>
          </div>

          {/* Team grid - Framer card: white, rounded-16, image 16px radius, info + LinkedIn */}
          <div className="grid grid-cols-2 gap-4 max-w-7xl mx-auto lg:grid-cols-4">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="team-card-reveal group rounded-[16px] overflow-hidden bg-white flex flex-col h-full w-full"
                style={{ backgroundColor: "rgb(255, 255, 255)" }}
              >
                <div
                  className="aspect-square w-full overflow-hidden p-2"
                  style={{ borderRadius: "14px 14px 8px 8px" }}
                >
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover block transition-transform duration-300 ease-out group-hover:scale-105"
                    style={{ borderRadius: "inherit", objectPosition: "center", objectFit: "cover" }}
                  />
                </div>
                <div className="p-5 flex flex-col flex-1 items-center text-center" data-framer-name="Info Block">
                  <div className="flex flex-col flex-1 text-center w-full">
                    <p className="text-lg font-semibold mb-1" style={{ color: "rgb(3, 2, 11)", fontFamily: "'DM Sans', sans-serif", lineHeight: "120%" }}>
                      {member.nameLine1}
                      <br />
                      {member.nameLine2}
                    </p>
                    <p className="text-sm mb-4" style={{ color: "rgb(88, 88, 102)" }}>
                      {member.roleLine1}
                      <br />
                      {member.roleLine2}
                    </p>
                  </div>
                  <a
                    href="https://www.linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white hover:opacity-90 transition-opacity flex-shrink-0"
                    style={{ backgroundColor: "rgb(3, 2, 11)", borderRadius: "100px" }}
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section className="py-24 relative bg-white">
        <div className="section-reveal container mx-auto px-6">
          <div className="grid grid-cols-1 gap-8 items-start lg:grid-cols-2 lg:gap-12">
            <div className="text-center lg:text-left lg:sticky lg:top-24 pt-4 flex flex-col lg:h-[600px]">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Why Choose EduHub?
              </h2>
              <p className="text-foreground/70 max-w-2xl lg:max-w-none mx-auto lg:mx-0 leading-relaxed mb-4 lg:mb-4" style={{ fontSize: '16px' }}>
                EDUHUB is an educational center working under TISU, a leading private university in Uzbekistan.
                It offers modern, high-quality language education using international standards.
                <span className="hidden lg:inline">
                  {" "}Our programs combine structured curricula with practical, real-world use so you can progress quickly and use the language confidently in work and study. Whether you are preparing for exams, career advancement, or academic exchange, EDUHUB supports your goals with experienced instructors and a learning environment designed for your success.
                </span>
              </p>
              <p className="hidden lg:block text-foreground/70 max-w-2xl lg:max-w-none mx-auto lg:mx-0 leading-relaxed mb-6 flex-1 min-h-0" style={{ fontSize: '16px' }}>
                Join a community of learners and professionals who choose EDUHUB for its commitment to quality, flexibility, and measurable results. From small-group classes to tailored one-on-one sessions, we adapt to your schedule and level so you can learn at your own pace while staying on track toward your language goals.
              </p>
              <div className="hidden lg:block">
              <Link
                to="/eduhub"
                className="mt-auto self-start inline-flex items-center gap-2 px-6 py-3 rounded-[37px] font-semibold text-white transition-opacity hover:opacity-90 w-fit mx-auto lg:mx-0 shrink-0"
                style={{ backgroundColor: "#3954d0" }}
              >
                Learn More
                <ArrowRight className="h-4 w-4" />
              </Link>
              </div>
            </div>

            <div className="flex flex-col gap-6 pt-2 lg:pt-4 pb-8 lg:pb-0">
            {features.map((feature, index) => (
                <div
                  key={index}
                  className="sticky top-[5.5rem] lg:top-24 rounded-[24px] overflow-hidden p-4 shadow-sm"
                  style={{
                    background: "rgb(249, 250, 251)",
                    zIndex: index + 1,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[rgb(238,238,238)] flex items-center justify-center flex-shrink-0 text-sm font-medium" style={{ color: "rgb(109, 109, 109)" }}>
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <h3 className="text-lg font-semibold" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(61, 61, 61)" }}>{feature.title}</h3>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm leading-relaxed" style={{ color: "rgb(109, 109, 109)" }}>{feature.description}</p>
                  </div>
                  <div className="mt-2 overflow-hidden rounded-[20px]">
                    <div className="aspect-[4/3] overflow-hidden rounded-[20px] bg-gray-200">
                      <img
                        src={feature.image}
                        alt={feature.imageAlt}
                        className="w-full h-full object-cover object-center"
                        onError={(e) => {
                          e.currentTarget.src = "https://placehold.co/600x450/e5e7eb/9ca3af?text=Image";
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center lg:hidden">
            <Link
              to="/eduhub"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[37px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#3954d0" }}
            >
              Learn More
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Vision & Mission Section - Framer layout: image left, content right with tabs */}

      <section className="py-20 bg-white relative">
        <div className="section-reveal container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Left - Image (fixed height, does not change when switching tabs) */}
            <div className="vision-reveal-left rounded-[24px] overflow-hidden w-full h-[320px] sm:h-[400px] lg:h-[600px] relative flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80"
                alt="EduHub vision"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            </div>

            {/* Right - Content with tabs */}
            <div className="vision-reveal-right flex flex-col min-h-[320px]">
              <div className="flex flex-col gap-4 mb-6">
                <div
                  className="inline-flex items-center gap-2 rounded-[32px] px-4 py-1.5 w-fit"
                  style={{ backgroundColor: "rgb(240, 244, 243)" }}
                >
                  <span className="text-sm font-medium" style={{ color: "rgb(19, 38, 27)" }}>
                    Vision &amp; Mission
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Where our vision and promises<br />come to life
                </h2>
              </div>

              {/* Tabs with elastic sliding indicator */}
              <div className="tabs mb-6">
                <div className="relative w-full">
                  <span
                    className="absolute top-0 left-0 z-0 h-10 w-1/3 rounded-full transition-transform duration-[400ms] ease-[cubic-bezier(0.33,1,0.68,1)] sm:h-11 lg:h-12"
                    style={{
                      backgroundColor: "#199eff",
                      transform: `translateX(${visionTab === "mission" ? 0 : visionTab === "vision" ? 100 : 200}%)`,
                    }}
                    aria-hidden
                  />
                  <ul className="grid grid-cols-3 list-none p-0 m-0 w-full">
                    <li>
                      <button
                        type="button"
                        role="tab"
                        onClick={() => setVisionTab("mission")}
                        className={`relative z-10 inline-flex h-10 w-full items-center justify-center rounded-full px-1 text-[11px] font-medium leading-tight transition-colors duration-200 sm:h-11 sm:px-2 sm:text-xs lg:h-12 lg:px-4 lg:text-sm ${visionTab !== "mission" ? "text-gray-500 hover:text-gray-800" : ""}`}
                        style={visionTab === "mission" ? { color: "#fff" } : undefined}
                      >
                        Our Mission
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        role="tab"
                        onClick={() => setVisionTab("vision")}
                        className={`relative z-10 inline-flex h-10 w-full items-center justify-center rounded-full px-1 text-[11px] font-medium leading-tight transition-colors duration-200 sm:h-11 sm:px-2 sm:text-xs lg:h-12 lg:px-4 lg:text-sm ${visionTab !== "vision" ? "text-gray-500 hover:text-gray-800" : ""}`}
                        style={visionTab === "vision" ? { color: "#fff" } : undefined}
                      >
                        Our Vision
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        role="tab"
                        onClick={() => setVisionTab("values")}
                        className={`relative z-10 inline-flex h-10 w-full items-center justify-center rounded-full px-1 text-[11px] font-medium leading-tight transition-colors duration-200 sm:h-11 sm:px-2 sm:text-xs lg:h-12 lg:px-4 lg:text-sm ${visionTab !== "values" ? "text-gray-500 hover:text-gray-800" : ""}`}
                        style={visionTab === "values" ? { color: "#fff" } : undefined}
                      >
                        Our Values
                      </button>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Tab content */}
              <div className="space-y-4">
                {visionTab === "mission" && (
                  <>
                    <p className="text-base leading-relaxed" style={{ color: "rgb(75, 85, 84)" }}>
                      EduHub is built around a clear direction and a set of fun, learner‑centered commitments that guide every class, activity, and experiment.
                    </p>
                    <ul className="space-y-3">
                      {[
                        "To provide accessible, high‑quality training programs that address academic, professional, and personal development needs.",
                        "To serve as a collaborative platform connecting students, educators, professionals, and communities for lifelong learning.",
                        "To design and deliver innovative training models that meet national and international standards.",
                        "To build partnerships with institutions and industries to enhance training relevance and global competitiveness.",
                        "To foster inclusivity, creativity, and adaptability in preparing participants for future challenges.",
                      ].map((text, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                        </div>
                          <span className="text-base leading-relaxed" style={{ color: "rgb(75, 85, 84)" }}>{text}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {visionTab === "vision" && (
                  <>
                    <p className="text-base leading-relaxed" style={{ color: "rgb(75, 85, 84)" }}>
                      To become a central hub of excellence for diverse training programs that empower students, local communities, and global learners with relevant skills and knowledge of national and international quality.
                    </p>
                    <ul className="space-y-3">
                      {[
                        { title: "Inspire", text: "Make economics and business feel exciting, visual, and story‑driven." },
                        { title: "Connect", text: "Bridge classrooms, workplaces, and communities in one playful space." },
                        { title: "Elevate", text: "Help every learner grow from curious beginner to confident practitioner." },
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                        </div>
                          <span className="text-base leading-relaxed" style={{ color: "rgb(75, 85, 84)" }}><strong>{item.title}:</strong> {item.text}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {visionTab === "values" && (
                  <>
                    <p className="text-base leading-relaxed" style={{ color: "rgb(75, 85, 84)" }}>
                      These commitments guide how we design every EduHub module, activity, and learner journey.
                    </p>
                    <ul className="space-y-3">
                      {[
                        "Relevant skills and knowledge of national and international quality.",
                        "Learner‑centered commitments in every class and activity.",
                        "Inclusivity, creativity, and adaptability for future challenges.",
                      ].map((text, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                        </div>
                          <span className="text-base leading-relaxed" style={{ color: "rgb(75, 85, 84)" }}>{text}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Student voices — bento layout (matches stats / features Framer panels) */}
      <section className="relative bg-gray-50 py-20">
        <div className="section-reveal container mx-auto max-w-7xl px-6">
          <div className="mb-12">
            <div className="flex w-full flex-col gap-6 text-left lg:flex-row lg:items-end lg:gap-16">
              <h2
                className="flex-shrink-0 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(3, 2, 11)" }}
              >
                Voices from
                <br />
                the classroom
              </h2>
              <p
                className="max-w-2xl text-base leading-relaxed lg:ml-auto lg:text-right"
                style={{ color: "rgb(88, 88, 102)" }}
              >
                Learners across business, language, and skills programs — in their own words, after finishing a class at EduHub.
              </p>
            </div>
          </div>

          <div className="rounded-[16px] p-2" style={{ backgroundColor: "rgb(249, 250, 251)" }}>
            <div className="grid gap-2 lg:grid-cols-12">
              <article
                className="review-card-reveal flex min-h-[320px] flex-col justify-between rounded-[20px] bg-white p-6 sm:p-8 lg:col-span-7 lg:row-span-2 lg:min-h-[420px] lg:p-10"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="inline-flex items-center rounded-[32px] px-3 py-1 text-xs font-medium"
                      style={{ backgroundColor: "rgb(240, 244, 243)", color: "rgb(19, 38, 27)" }}
                    >
                      {featuredReview.course}
                    </span>
                    <ReviewStars rating={featuredReview.rating} size="md" />
                  </div>
                  <p
                    className="mt-6 text-xl font-medium leading-snug sm:text-2xl lg:text-[1.65rem] lg:leading-[1.35]"
                    style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(3, 2, 11)" }}
                  >
                    {featuredReview.quote}
                  </p>
                </div>
                <div className="mt-8 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold" style={{ color: "rgb(3, 2, 11)", fontFamily: "'DM Sans', sans-serif" }}>
                      {featuredReview.name}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: "rgb(88, 88, 102)" }}>
                      EduHub student
                    </p>
                  </div>
                  <span
                    className="select-none text-5xl font-bold leading-none sm:text-6xl"
                    style={{ color: "rgb(238, 238, 238)", fontFamily: "'DM Sans', sans-serif" }}
                    aria-hidden
                  >
                    {reviewIndexLabel(studentReviews.indexOf(featuredReview))}
                  </span>
                </div>
              </article>

              {supportingReviews.slice(0, 2).map((review) => {
                const reviewIndex = studentReviews.indexOf(review);
                return (
                  <article
                    key={review.name}
                    className="review-card-reveal flex min-h-[200px] flex-col rounded-[20px] bg-white p-5 sm:p-6 lg:col-span-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium"
                        style={{ backgroundColor: "rgb(238, 238, 238)", color: "rgb(109, 109, 109)" }}
                      >
                        {reviewIndexLabel(reviewIndex)}
                      </div>
                      <p className="pt-1 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: "rgb(109, 109, 109)" }}>
                        {review.course}
                      </p>
                    </div>
                    <ReviewStars rating={review.rating} className="mt-3" />
                    <p className="mt-3 flex-1 text-sm leading-relaxed sm:text-[15px]" style={{ color: "rgb(75, 85, 84)" }}>
                      {review.quote}
                    </p>
                    <p className="mt-5 text-sm font-semibold" style={{ color: "rgb(3, 2, 11)", fontFamily: "'DM Sans', sans-serif" }}>
                      {review.name}
                    </p>
                  </article>
                );
              })}

              {supportingReviews.slice(2).map((review) => {
                const reviewIndex = studentReviews.indexOf(review);
                return (
                  <article
                    key={review.name}
                    className="review-card-reveal flex min-h-[200px] flex-col rounded-[20px] bg-white p-5 sm:p-6 lg:col-span-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium"
                        style={{ backgroundColor: "rgb(238, 238, 238)", color: "rgb(109, 109, 109)" }}
                      >
                        {reviewIndexLabel(reviewIndex)}
                      </div>
                      <p className="text-sm font-semibold" style={{ color: "rgb(61, 61, 61)", fontFamily: "'DM Sans', sans-serif" }}>
                        {review.course}
                      </p>
                    </div>
                    <ReviewStars rating={review.rating} className="mt-3" />
                    <p className="mt-3 flex-1 text-sm leading-relaxed line-clamp-4" style={{ color: "rgb(75, 85, 84)" }}>
                      {review.quote}
                    </p>
                    <p className="mt-4 text-sm font-semibold" style={{ color: "rgb(3, 2, 11)", fontFamily: "'DM Sans', sans-serif" }}>
                      {review.name}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Video Content Section - Framer layout: content left, video right */}
      <section className="py-24 bg-background">
        <div className="section-reveal container mx-auto px-6">
          <div className="grid lg:grid-cols-[2fr_3fr] gap-12 items-stretch p-8 bg-gray-100 rounded-[16px]">
            {/* Left - Content (Framer style: pill badge, heading, text, button, stars) */}
            <div className="flex flex-col">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(17, 17, 17)" }}>
                Discover Our
                <br />
                Learning Platform
              </h2>
              <p className="mb-6 leading-relaxed max-w-md" style={{ color: "rgb(61, 61, 61)", fontSize: "16px" }}>
                Experience our innovative online learning platform through this comprehensive video tour.
                See how we make education accessible, engaging, and effective for students worldwide.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold mb-1" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1.125rem", color: "rgb(17, 17, 17)" }}>Interactive Learning</h3>
                    <p className="text-sm" style={{ color: "rgb(61, 61, 61)" }}>Engage with multimedia content and interactive exercises</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold mb-1" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1.125rem", color: "rgb(17, 17, 17)" }}>Expert Instructors</h3>
                    <p className="text-sm" style={{ color: "rgb(61, 61, 61)" }}>Learn from industry professionals and academic experts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold mb-1" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1.125rem", color: "rgb(17, 17, 17)" }}>Flexible Schedule</h3>
                    <p className="text-sm" style={{ color: "rgb(61, 61, 61)" }}>Study at your own pace, anytime and anywhere</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Video (Framer image slot) */}
            <div className="relative rounded-lg overflow-hidden h-full">
              <video className="w-full h-full object-cover rounded-[16px]" controls>
                <source src="/tisu2.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* Insights & Updates / Blog Section */}
      <section className="py-24 bg-background">
        <div className="section-reveal container mx-auto px-6 max-w-6xl">
          <header className="text-center mb-12">
            <div
              className="inline-flex items-center justify-center rounded-[40px] px-5 py-2.5 mb-6 border border-[rgb(230,230,230)] bg-white text-base font-medium"
              style={{ boxShadow: "rgba(0,0,0,0.1) 0px 4px 12px 0px", color: "rgb(61, 61, 61)" }}
            >
              Blog
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-center" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(61, 61, 61)" }}>
              Insights &amp; Updates
            </h2>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div>
            <Link
              to="/journal"
              className="group block rounded-[24px] overflow-hidden transition-shadow duration-300 hover:shadow-[0_10px_15px_rgba(0,0,0,0.15)]"
              style={{ background: "linear-gradient(336deg, rgb(250,250,250) 0%, rgb(255,255,255) 54%, rgb(238,238,238) 100%)" }}
            >
              <div className="rounded-[20px] overflow-hidden p-2">
                <div className="rounded-[20px] overflow-hidden aspect-[4/3] bg-gray-200">
                  <img
                    src="https://framerusercontent.com/images/iY9yzf6jj5xEzAY4OnAslUkNlrs.jpeg"
                    alt="Green Fern"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              </div>
              <div className="p-5 pt-0">
                <h5 className="text-lg font-semibold mb-2 group-hover:underline" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(61, 61, 61)" }}>
                  New Language Programs Launch This Semester
                </h5>
                <p className="text-sm leading-relaxed" style={{ color: "rgb(153, 153, 153)" }}>
                  Discover our expanded offerings in business English, academic writing, and conversation practice—designed for busy professionals and students.
                </p>
              </div>
            </Link>
            </div>

            <div>
            <Link
              to="/journal"
              className="group block rounded-[24px] overflow-hidden transition-shadow duration-300 hover:shadow-[0_10px_15px_rgba(0,0,0,0.15)]"
              style={{ background: "linear-gradient(336deg, rgb(250,250,250) 0%, rgb(255,255,255) 54%, rgb(238,238,238) 100%)" }}
            >
              <div className="rounded-[20px] overflow-hidden p-2">
                <div className="rounded-[20px] overflow-hidden aspect-[4/3] bg-gray-200">
                  <img
                    src="https://framerusercontent.com/images/Bn1przMMEo1Gy185OXSiWZPiy8c.jpeg"
                    alt="Yellow Flower"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              </div>
              <div className="p-5 pt-0">
                <h5 className="text-lg font-semibold mb-2 group-hover:underline" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(61, 61, 61)" }}>
                  EduHub Student Success Stories: From Classroom to Career
                </h5>
                <p className="text-sm leading-relaxed" style={{ color: "rgb(153, 153, 153)" }}>
                  Read how our graduates are using their language skills and certifications to advance in international roles and higher education.
                </p>
              </div>
            </Link>
            </div>

            <div>
            <Link
              to="/journal"
              className="group block rounded-[24px] overflow-hidden transition-shadow duration-300 hover:shadow-[0_10px_15px_rgba(0,0,0,0.15)]"
              style={{ background: "linear-gradient(336deg, rgb(250,250,250) 0%, rgb(255,255,255) 54%, rgb(238,238,238) 100%)" }}
            >
              <div className="rounded-[20px] overflow-hidden p-2">
                <div className="rounded-[20px] overflow-hidden aspect-[4/3] bg-gray-200">
                  <img
                    src="https://framerusercontent.com/images/4FZjdsBmWWHU4pj8TT0nUi9q4.jpeg"
                    alt="Orange Flower"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              </div>
              <div className="p-5 pt-0">
                <h5 className="text-lg font-semibold mb-2 group-hover:underline" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(61, 61, 61)" }}>
                  Upcoming Workshops and Cultural Exchange Events
                </h5>
                <p className="text-sm leading-relaxed" style={{ color: "rgb(153, 153, 153)" }}>
                  Join speaking clubs, exam prep sessions, and partner events with TISU—stay updated on dates and how to register.
                </p>
              </div>
            </Link>
            </div>
          </div>

          <div className="flex justify-center">
            <div>
            <Link
              to="/journal"
              className="inline-flex items-center justify-center rounded-[40px] px-6 py-3.5 font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: "rgb(0, 0, 0)", color: "rgb(255, 255, 255)", boxShadow: "rgba(0,0,0,0.15) 0px 4px 8px 0px" }}
            >
              Read More
            </Link>
          </div>
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-24 bg-white">
        <div className="section-reveal container mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Learning Highlights
            </h2>
            <p className="text-foreground/70 max-w-2xl mx-auto leading-relaxed" style={{ fontSize: '16px' }}>
              Everything you need for a successful learning journey
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((highlight, index) => {
              const Icon = highlight.icon;
              return (
                <div
                  key={index}
                  className="flex flex-col rounded-2xl p-6 bg-white"
                >
                  <div className="flex flex-col gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "rgb(245, 248, 255)" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: "rgb(18, 18, 18)" }} />
                    </div>
                    <h3 className="text-xl font-semibold" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(18, 18, 18)", fontSize: "20px" }}>
                      {highlight.title}
                    </h3>
                  </div>
                  <p className="text-base leading-relaxed flex-1" style={{ color: "rgb(109, 109, 109)", fontSize: "16px" }}>
                    {highlight.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section - Framer banner style (dark bg, badge, heading, mint CTA) - hidden per request */}
      <section className="py-24 bg-white hidden" aria-hidden="true">
        <div className="container mx-auto px-6">
          <div
            className="relative overflow-hidden rounded-2xl p-12 lg:p-16 text-center"
            style={{ backgroundColor: "rgb(3, 31, 42)" }}
          >
            <div className="relative z-10 flex flex-col items-center">
              {/* Top row: badge pill + text pill (Framer With Logo - Dark) */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                <div
                  className="inline-flex items-center justify-center rounded-[10px] px-3 py-1.5"
                  style={{ backgroundColor: "rgb(216, 242, 194)" }}
                >
                  <img src="/logo-eduhub.png" alt="" className="h-6 w-auto object-contain" />
                </div>
                <div
                  className="inline-flex items-center rounded-[10px] px-3 py-1.5 text-sm font-medium text-white"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                >
                  Quality education
                </div>
              </div>
              <h3
                className="text-2xl lg:text-4xl font-bold mb-8 text-white max-w-2xl"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Ready to start learning?
              </h3>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-base font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: "rgb(215, 245, 188)", color: "rgb(3, 31, 42)" }}
              >
                Get started — it's free
                <span className="ml-1">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-[100] w-14 h-14 text-white rounded-full shadow-2xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center hover:scale-110 border-2 border-white hover:opacity-90 ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ backgroundColor: '#199eff' }}
        aria-label="Scroll to top"
      >
        <ChevronUp className="h-7 w-7" />
      </button>

      <Footer />
    </div>
  );
};

export default EduHub;

