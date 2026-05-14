import { Facebook, Twitter, Instagram, Linkedin, Youtube, Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useState } from "react";

const footerLinks = {
  academics: {
    title: "Other",
    links: ["About", "Contact", "FAQ", "Terms & Conditions", "Privacy Policy"],
  },
  admissions: {
    title: "Information",
    links: ["Payment Method", "EduHub Team", "International Students", "Open Days", "Contact Us"],
  },
  connect: {
    title: "Connect",
    links: ["Alumni", "Giving", "Jobs", "Press Office", "Conference & Events"],
  },
};

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Youtube, href: "#", label: "YouTube" },
];

const Footer = () => {
  const location = useLocation();
  const isEduHubPage = location.pathname === "/eduhub" || location.pathname.startsWith("/eduhub/");
  const isJournalPage = location.pathname === "/journal" || location.pathname.startsWith("/journal/");
  const [email, setEmail] = useState("");
  
  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle subscription logic here
    console.log("Subscribe:", email);
    setEmail("");
  };
  
  // Filter out Connect section on EduHub page
  const filteredFooterLinks = isEduHubPage 
    ? Object.fromEntries(Object.entries(footerLinks).filter(([key]) => key !== "connect"))
    : footerLinks;
  
  // Filter out specific links from Information section on EduHub page
  const processedFooterLinks = isEduHubPage
    ? Object.fromEntries(
        Object.entries(filteredFooterLinks).map(([key, section]) => {
          if (key === "admissions") {
            return [
              key,
              {
                ...section,
                links: section.links.filter(
                  (link) => !["International Students", "Open Days", "Contact Us"].includes(link)
                ),
              },
            ];
          }
          return [key, section];
        })
      )
    : filteredFooterLinks;
  
  // Journal page has different footer styling
  if (isJournalPage) {
    return (
      <footer className="bg-gray-100 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <h3 className="text-lg font-bold text-gray-900 mb-4">TUES Journal</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Research, commentary, and analysis from economists, scholars, and policy thinkers.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/journal" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    Home
                  </a>
                </li>
                <li>
                  <a href="/journal/articles" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    Articles
                  </a>
                </li>
                <li>
                  <a href="/journal/authors" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    Authors
                  </a>
                </li>
                <li>
                  <a href="/journal/topics" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    Topics
                  </a>
                </li>
              </ul>
            </div>

            {/* About */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">About</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/journal/about" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    Editorial Team
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    Submission Guidelines
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href="mailto:journal@tues.uz" className="hover:text-gray-900 transition-colors">
                    journal@tues.uz
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href="tel:+998777029695" className="hover:text-gray-900 transition-colors">
                    +998 777029695
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>38B, Ibn Sino, Termez</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-300 mt-8 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                © 2026 TUES Economics Journal. All rights reserved.
              </div>
              <div className="flex items-center gap-4">
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Terms of Use
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  const cream = "rgb(253, 253, 251)";
  const creamMuted = "rgb(249, 249, 247)";
  const dark = "rgb(38, 41, 46)";

  return (
    <footer className="w-full bg-white">
      <div className="container mx-auto px-6 py-8">
        {/* Footer Banner - Framer style: dark rounded card */}
        <div
          className="rounded-[40px] p-8 lg:p-12"
          style={{ backgroundColor: dark }}
        >
          {/* Footer Top - columns */}
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            {/* Column 1 - Subscribe (EduHub only) */}
            {isEduHubPage && (
              <div className="lg:col-span-4">
                <p className="text-sm font-medium mb-4" style={{ color: cream }}>
                  Subscribe
                </p>
                <form onSubmit={handleSubscribe} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <input
                      type="email"
                      required
                      name="Email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 min-w-0 rounded-full border px-4 py-3 text-sm placeholder:opacity-80 focus:outline-none focus:ring-2 focus:ring-white/30"
                      style={{
                        backgroundColor: cream,
                        borderColor: "rgba(136, 136, 136, 0.2)",
                        color: dark,
                      }}
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-full py-3 px-5 text-base font-medium shrink-0 hover:opacity-90 text-white transition-colors"
                    style={{ backgroundColor: '#199eff' }}
                    >
                      Subscribe
                      <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: cream }}>
                        <ArrowRight className="h-4 w-4" style={{ color: dark }} />
                      </span>
                    </button>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: creamMuted }}>
                    By subscribing you agree to our{" "}
                    <a href="#" className="underline hover:opacity-90" style={{ color: cream }}>
                      Privacy Policy
                    </a>{" "}
                    and consent to receive updates from EduHub.
                  </p>
                </form>
              </div>
            )}

            {/* Column 2 - Contact + Social (narrower so menu can widen) */}
            <div className={isEduHubPage ? "lg:col-span-3" : "lg:col-span-5"}>
              <p className="text-sm font-medium mb-4" style={{ color: cream }}>
                Contact
              </p>
              <ul className="space-y-2 text-sm mb-6" style={{ color: creamMuted }}>
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>38B, Ibn Sino, Termez</span>
                </li>
                <li>
                  <a href="tel:+998777029695" className="hover:opacity-90 transition-opacity">
                    +998 777029695
                  </a>
                </li>
                <li>
                  <a href="mailto:info@ox.ac.uk" className="hover:opacity-90 transition-opacity">
                    info@ox.ac.uk
                  </a>
                </li>
                <li>
                  <a href="https://t.me/eduhub_tisu_admin" target="_blank" rel="noopener noreferrer" className="hover:opacity-90 transition-opacity">
                    Telegram @eduhub_tisu_admin
                  </a>
                </li>
                <li>
                  <a href="https://instagram.com/_tisu_eduhub" target="_blank" rel="noopener noreferrer" className="hover:opacity-90 transition-opacity">
                    Instagram @_tisu_eduhub
                  </a>
                </li>
              </ul>
              <div className="flex items-center gap-2">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      aria-label={social.label}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: creamMuted }}
                    >
                      <Icon className="h-4 w-4" style={{ color: dark }} />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Column 3 - Menu Links (wider grid for single-line labels) */}
            <div className={isEduHubPage ? "lg:col-span-5" : "lg:col-span-7"}>
              <p className="text-sm font-medium mb-4" style={{ color: cream }}>
                Menu Links
              </p>
              <ul className="grid grid-cols-3 gap-x-3 gap-y-2.5 sm:gap-x-6 lg:gap-x-10 list-none p-0 m-0 text-left [grid-template-columns:minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                {Object.values(processedFooterLinks).map((section) =>
                  section.links.map((link) => (
                    <li key={`${section.title}-${link}`} className="min-w-0">
                      <a
                        href="#"
                        className="text-sm transition-colors hover:opacity-90 whitespace-nowrap block"
                        style={{ color: creamMuted }}
                      >
                        {link}
                      </a>
                    </li>
                  )),
                )}
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="mt-10 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <a href="/eduhub" className="shrink-0">
              <img src="/logo-eduhub.png" alt="EduHub" className="h-8 w-auto object-contain opacity-90" />
            </a>
            <p className="text-sm text-center" style={{ color: creamMuted }}>
              © 2026 EduHub. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm" style={{ color: creamMuted }}>
              <a href="#" className="hover:opacity-90 transition-opacity">Privacy Policy</a>
              <a href="#" className="hover:opacity-90 transition-opacity">Terms of Use</a>
              <a href="#" className="hover:opacity-90 transition-opacity">Accessibility</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
