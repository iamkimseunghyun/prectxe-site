import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  MapPin,
  Clock,
  PlayCircle,
  Search as SearchIcon,
  Filter as FilterIcon,
  ChevronRight,
  Heart,
  Sun,
  Moon,
} from "lucide-react";

/**
 * PRECTXE Web Wireframes & UI Kit (v0.1)
 * - Focus: Exhibition/Live/Party discovery, schedule-first UX, archive & journal
 * - NOTE: All ticket-purchase UI intentionally removed per request
 * - Tech: React + Tailwind (assumed), framer-motion micro-animations, lucide-react icons
 * - Style: Dark-first, soft shadows, rounded-2xl, grid-based layout
 */

// ---------- Helpers ----------
const cn = (...classes) => classes.filter(Boolean).join(" ");

const useDarkMode = () => {
  const [dark, setDark] = useState(true);
  return { dark, toggle: () => setDark((d) => !d) };
};

// ---------- Tokens (can be mapped to Tailwind config later) ----------
const tokens = {
  radius: {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
    xl: "rounded-3xl",
  },
  shadow: {
    sm: "shadow-sm",
    md: "shadow",
    lg: "shadow-lg",
    xl: "shadow-2xl",
  },
  color: {
    bg: "bg-neutral-950",
    panel: "bg-neutral-900/70",
    surface: "bg-neutral-900",
    border: "border-neutral-800",
    text: "text-neutral-100",
    subtext: "text-neutral-400",
    brand: "from-fuchsia-500 via-cyan-400 to-emerald-400",
    accent: "text-cyan-300",
    accentBg: "bg-cyan-500/10",
    focus: "ring-2 ring-cyan-400/60",
  },
};

// ---------- Primitive Components ----------
const Container = ({ children, className = "" }) => (
  <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", className)}>{children}</div>
);

const Section = ({ title, subtitle, actions, children }) => (
  <section className="py-8 sm:py-10">
    <Container>
      {(title || subtitle || actions) && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-100">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm sm:text-base text-neutral-400 mt-1 max-w-2xl">{subtitle}</p>
            )}
          </div>
          {actions}
        </div>
      )}
      {children}
    </Container>
  </section>
);

const Button = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  icon: Icon,
  ...props
}) => {
  const base = "inline-flex items-center justify-center font-medium transition-all active:scale-[.98]";
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4 text-sm",
    lg: "h-12 px-5 text-base",
    xl: "h-14 px-6 text-base",
  }[size];
  const styles = {
    primary: "bg-neutral-100 text-neutral-900 hover:bg-white " + tokens.radius.lg,
    secondary: "bg-neutral-800 text-neutral-100 hover:bg-neutral-700 " + tokens.radius.lg + " border border-neutral-700",
    ghost: "bg-transparent hover:bg-neutral-800/60 text-neutral-200 " + tokens.radius.lg,
    outline: "border border-neutral-700 text-neutral-100 hover:bg-neutral-800/60 " + tokens.radius.lg,
    subtle: "bg-neutral-900 text-neutral-200 border border-neutral-800 hover:bg-neutral-800 " + tokens.radius.lg,
  }[variant];
  return (
    <button className={cn(base, sizes, styles, className)} {...props}>
      {Icon && <Icon className="mr-2 h-4 w-4" />}
      {children}
    </button>
  );
};

const Badge = ({ children, selected = false, className = "", onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 h-8 inline-flex items-center gap-2 text-xs border", 
      tokens.radius.sm,
      selected ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-300" : "border-neutral-800 text-neutral-300 hover:bg-neutral-900",
      className
    )}
  >
    {children}
  </button>
);

const Card = ({ children, className = "" }) => (
  <div className={cn("border border-neutral-800 bg-neutral-900/60 " + tokens.radius.lg + " " + tokens.shadow.lg, className)}>
    {children}
  </div>
);

const Input = ({ icon: Icon, className = "", ...props }) => (
  <div className={cn("relative", className)}>
    {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />}
    <input
      className={cn(
        "w-full h-11 bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500 pl-10 pr-3",
        tokens.radius.lg,
        "focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
      )}
      {...props}
    />
  </div>
);

const Toggle = ({ value, onChange }) => (
  <button
    onClick={onChange}
    className={cn(
      "w-16 h-9 border border-neutral-700 flex items-center",
      tokens.radius.lg,
      value ? "bg-neutral-800" : "bg-neutral-900"
    )}
  >
    <span
      className={cn(
        "h-7 w-7 bg-neutral-100 rounded-full transform transition-all mx-1",
        value ? "translate-x-7" : "translate-x-0"
      )}
    />
  </button>
);

// ---------- Layout ----------
const AppShell = ({ children, dark, onToggleTheme }) => (
  <div className={cn("min-h-screen", dark ? tokens.color.bg : "bg-white text-neutral-900")}>    
    <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60 bg-neutral-950/80 border-b border-neutral-900">
      <Container>
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-fuchsia-500 via-cyan-400 to-emerald-400" />
            <span className="font-semibold tracking-tight text-neutral-100">PRECTXE</span>
            <nav className="hidden md:flex items-center gap-2 ml-6">
              {[
                ["Home", "#home"],
                ["Programs", "#programs"],
                ["Program Detail", "#detail"],
                ["Archive", "#archive"],
                ["Journal", "#journal"],
                ["UI Kit", "#uikit"],
              ].map(([label, href]) => (
                <a key={label} href={href} className="text-sm text-neutral-300 hover:text-white px-3 py-2 rounded-lg hover:bg-neutral-800/60">
                  {label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="md" className="hidden sm:inline-flex" icon={SearchIcon}>Search</Button>
            <button
              onClick={onToggleTheme}
              className="h-10 w-10 flex items-center justify-center border border-neutral-800 rounded-xl text-neutral-300 hover:bg-neutral-800/60"
              title="Toggle theme"
            >
              {dark ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}
            </button>
          </div>
        </div>
      </Container>
    </header>
    <main className="pb-24">{children}</main>
    <footer className="border-t border-neutral-900 py-10">
      <Container>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-fuchsia-500 via-cyan-400 to-emerald-400" />
            <p className="text-neutral-400 text-sm mt-2">© PRECTXE. All rights reserved.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <a href="#" className="text-neutral-300 hover:text-white">About</a>
            <a href="#" className="text-neutral-300 hover:text-white">Partners</a>
            <a href="#" className="text-neutral-300 hover:text-white">Press</a>
            <a href="#" className="text-neutral-300 hover:text-white">Contact</a>
          </div>
        </div>
      </Container>
    </footer>
  </div>
);

// ---------- Feature Components ----------
const Hero = () => (
  <div className="relative h-[58vh] md:h-[68vh] overflow-hidden border-b border-neutral-900">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_60%)]"/>
    <div className="absolute inset-0 -z-10 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-950"/>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-[86%] max-w-5xl aspect-[16/9] bg-neutral-900/50 border border-neutral-800 rounded-3xl flex items-center justify-center">
        <div className="text-center">
          <PlayCircle className="mx-auto h-12 w-12 text-neutral-400" />
          <p className="mt-2 text-neutral-400 text-sm">Video Placeholder — 10s loop</p>
        </div>
      </div>
    </div>
    <Container>
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-5xl">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-neutral-100">LIGHTFIELD — Summer Program</h1>
            <p className="text-neutral-400 mt-2 max-w-2xl">Immersive installations, AV live, and late-night parties across S-Factory, Seoul. Curated by PRECTXE.</p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Button variant="primary" size="lg">Explore Programs</Button>
            <Button variant="ghost" size="lg" icon={ChevronRight}>Learn more</Button>
          </div>
        </div>
      </div>
    </Container>
  </div>
);

const CalendarStrip = () => {
  const days = useMemo(() => {
    const today = new Date();
    const out = [];
    for (let i = -3; i < 18; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      out.push(d);
    }
    return out;
  }, []);
  const isSameDay = (a, b) => a.toDateString() === b.toDateString();
  const today = new Date();
  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max">
        {days.map((d) => (
          <div key={d.toISOString()} className={cn("px-3 py-2 text-center border", tokens.radius.md, isSameDay(d, today) ? "border-cyan-400/60 bg-cyan-500/10" : "border-neutral-800 bg-neutral-900/60")}>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
            <div className="text-base text-neutral-100">{d.getDate()}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProgramCard = ({ kind = "Exhibition", title = "On Being — Max Cooper", when = "Aug 02 – Sep 07", where = "S-Factory D, Seoul" }) => (
  <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
    <Card className="overflow-hidden">
      <div className="aspect-[16/9] bg-neutral-800" />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-neutral-400">{kind}</span>
          <button className="text-neutral-300 hover:text-white">
            <Heart className="h-4 w-4" />
          </button>
        </div>
        <h3 className="mt-1 text-neutral-100 font-medium">{title}</h3>
        <div className="mt-2 flex items-center gap-3 text-neutral-400 text-sm">
          <div className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {when}</div>
          <div className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {where}</div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button variant="secondary" size="sm">Details</Button>
          <Button variant="ghost" size="sm">Add to Calendar</Button>
        </div>
      </div>
    </Card>
  </motion.div>
);

const FilterBar = () => (
  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
    <Input icon={SearchIcon} placeholder="Search artists, programs…" className="md:col-span-5" />
    <div className="md:col-span-7 flex flex-wrap items-center gap-2">
      <Badge selected>All</Badge>
      <Badge>Exhibition</Badge>
      <Badge>Live</Badge>
      <Badge>Party</Badge>
      <Badge>Seoul</Badge>
      <Badge>Pohang</Badge>
      <Badge>Aug</Badge>
      <Badge>Sep</Badge>
      <Button variant="outline" size="sm" className="ml-auto" icon={FilterIcon}>More Filters</Button>
    </div>
  </div>
);

const CreditsList = () => (
  <div className="grid sm:grid-cols-2 gap-4 text-sm">
    {[
      ["Artist", "Max Cooper"],
      ["Collaborators", "Kevin McGloughlin, Memo Akten"],
      ["Curator", "PRECTXE"],
      ["Venue", "S-Factory D"],
    ].map(([k, v]) => (
      <div key={k} className="border border-neutral-800 p-3 rounded-xl">
        <div className="text-neutral-400 text-xs">{k}</div>
        <div className="text-neutral-100">{v}</div>
      </div>
    ))}
  </div>
);

const MapPlaceholder = () => (
  <div className="h-64 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center">
    <MapPin className="h-6 w-6 text-neutral-400" />
    <span className="ml-2 text-neutral-400 text-sm">Map / Directions placeholder</span>
  </div>
);

const JournalCard = () => (
  <Card>
    <div className="aspect-[16/9] bg-neutral-800" />
    <div className="p-4">
      <div className="text-[11px] uppercase tracking-wider text-neutral-400">Journal</div>
      <h3 className="mt-1 text-neutral-100 font-medium">Behind the Scenes — Building LIGHTFIELD</h3>
      <p className="text-neutral-400 text-sm mt-1">Process notes, renders, and set design from our immersive build.</p>
      <div className="mt-3"><Button variant="secondary" size="sm">Read</Button></div>
    </div>
  </Card>
);

const Pagination = () => (
  <div className="flex items-center justify-center gap-2 mt-6">
    {Array.from({ length: 5 }).map((_, i) => (
      <button key={i} className={cn("h-9 w-9 border border-neutral-800 rounded-xl text-sm", i === 1 ? "bg-neutral-800 text-white" : "text-neutral-300 hover:bg-neutral-900")}>{i + 1}</button>
    ))}
  </div>
);

// ---------- Wireframes ----------
const HomeWireframe = () => (
  <div id="home">
    <Hero />
    <Section title="This Month" subtitle="Tap a date to see what's on.">
      <CalendarStrip />
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ProgramCard kind="Exhibition" />
        <ProgramCard kind="Live" title="Röyksopp — True Electric (DJ)" when="Dec 13 (Sat)" where="S-Factory, Seoul" />
        <ProgramCard kind="Party" title="Afterlight — Closing Night" when="Sep 06 (Sat)" where="S-Factory D, Seoul" />
      </div>
    </Section>
    <Section title="Journal" subtitle="Stories, interviews, production notes.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <JournalCard />
        <JournalCard />
        <JournalCard />
      </div>
    </Section>
  </div>
);

const ProgramsWireframe = () => (
  <div id="programs">
    <Section title="Programs" subtitle="Browse exhibitions, AV live, and parties by date, city, or theme." actions={<Button variant="ghost" icon={ChevronRight}>View Calendar</Button>}>
      <FilterBar />
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <ProgramCard key={i} kind={i % 3 === 0 ? "Exhibition" : i % 3 === 1 ? "Live" : "Party"} />
        ))}
      </div>
      <Pagination />
    </Section>
  </div>
);

const ProgramDetailWireframe = () => (
  <div id="detail">
    <Section title="Program Detail" subtitle="Hero → Story → Credits → Schedule → Gallery → Map (no tickets).">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-[16/9] bg-neutral-900 border border-neutral-800 rounded-3xl flex items-center justify-center">
            <PlayCircle className="h-10 w-10 text-neutral-400" />
          </div>
          <div>
            <h3 className="text-neutral-100 text-xl font-medium">On Being — Max Cooper</h3>
            <p className="text-neutral-400 mt-2">An immersive installation exploring emergence and identity. Short description goes here. Keep it under ~280 chars for scannability.</p>
          </div>
          <div>
            <h4 className="text-neutral-200 font-medium">Credits</h4>
            <div className="mt-3"><CreditsList /></div>
          </div>
          <div>
            <h4 className="text-neutral-200 font-medium">Schedule</h4>
            <ul className="mt-3 space-y-2 text-sm text-neutral-300">
              <li className="flex items-center gap-2"><Clock className="h-4 w-4"/> Tue–Sun 11:00–20:00</li>
              <li className="flex items-center gap-2"><Clock className="h-4 w-4"/> Last entry 19:00</li>
            </ul>
          </div>
          <div>
            <h4 className="text-neutral-200 font-medium">Gallery</h4>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-neutral-900 border border-neutral-800 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <Card className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-neutral-400">Info</div>
            <div className="mt-1 text-neutral-100">S-Factory D, Seoul</div>
            <div className="mt-2 text-neutral-400 text-sm">Aug 02 – Sep 07</div>
            <div className="mt-3 flex items-center gap-2">
              <Button variant="secondary" size="md">Add to Calendar</Button>
              <Button variant="ghost" size="md">Share</Button>
            </div>
          </Card>
          <MapPlaceholder />
          <Card className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-neutral-400">Good to Know</div>
            <ul className="mt-2 list-disc list-inside text-neutral-300 text-sm space-y-1">
              <li>Approx. 20–30 min visit</li>
              <li>Photography allowed (no flash)</li>
              <li>Strobe & loud sound warning</li>
            </ul>
          </Card>
        </div>
      </div>
    </Section>
  </div>
);

const ArchiveWireframe = () => (
  <div id="archive">
    <Section title="Archive" subtitle="Browse past exhibitions and shows by year, city, and artist.">
      <FilterBar />
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <ProgramCard key={i} kind={i % 2 ? "Exhibition" : "Live"} />
        ))}
      </div>
      <Pagination />
    </Section>
  </div>
);

const JournalWireframe = () => (
  <div id="journal">
    <Section title="Journal" subtitle="Interviews, features, and production diaries.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <JournalCard key={i} />
        ))}
      </div>
      <Pagination />
    </Section>
  </div>
);

// ---------- UI KIT ----------
const UIKit = () => (
  <div id="uikit">
    <Section title="UI Kit — Buttons">
      <div className="flex flex-wrap gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="subtle">Subtle</Button>
        <Button variant="primary" size="sm">Sm</Button>
        <Button variant="primary" size="lg">Lg</Button>
        <Button variant="primary" size="xl">Xl</Button>
      </div>
    </Section>

    <Section title="UI Kit — Inputs & Filters">
      <div className="grid md:grid-cols-2 gap-4">
        <Input icon={SearchIcon} placeholder="Search…" />
        <div className="flex flex-wrap items-center gap-2">
          <Badge selected>All</Badge>
          <Badge>Exhibition</Badge>
          <Badge>Live</Badge>
          <Badge>Party</Badge>
          <Badge>Seoul</Badge>
          <Badge>Pohang</Badge>
          <Badge>Aug</Badge>
          <Badge>Sep</Badge>
        </div>
      </div>
    </Section>

    <Section title="UI Kit — Cards">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ProgramCard />
        <JournalCard />
        <Card className="p-6 flex items-center justify-center text-neutral-400">Generic Card</Card>
      </div>
    </Section>

    <Section title="UI Kit — Content Blocks">
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-neutral-200 font-medium">Credits List</h4>
          <div className="mt-3"><CreditsList /></div>
        </div>
        <div>
          <h4 className="text-neutral-200 font-medium">Map Placeholder</h4>
          <div className="mt-3"><MapPlaceholder /></div>
        </div>
      </div>
    </Section>

    <Section title="Foundations — Type & Spacing" subtitle="System scale to align rhythm across components.">
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="text-neutral-400 text-sm">Type Scale</div>
          <div className="mt-3 space-y-2">
            <div className="text-4xl font-semibold text-neutral-100">Display / 40px</div>
            <div className="text-3xl font-semibold text-neutral-100">H1 / 32px</div>
            <div className="text-2xl font-semibold text-neutral-100">H2 / 24px</div>
            <div className="text-xl font-medium text-neutral-100">H3 / 20px</div>
            <div className="text-base text-neutral-200">Body / 16px</div>
            <div className="text-sm text-neutral-400">Caption / 14px</div>
            <div className="text-xs text-neutral-500">Meta / 12px</div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-neutral-400 text-sm">Spacing</div>
          <div className="mt-3 grid grid-cols-6 gap-4 items-end">
            {[4,8,12,16,24,32].map((s) => (
              <div key={s} className="text-center">
                <div className="mx-auto w-6 bg-neutral-800" style={{ height: s }} />
                <div className="text-neutral-400 text-xs mt-2">{s}px</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Section>
  </div>
);

// ---------- Page ----------
export default function PRECTXE_Wireframes_UIKit() {
  const { dark, toggle } = useDarkMode();
  return (
    <AppShell dark={dark} onToggleTheme={toggle}>
      <HomeWireframe />
      <ProgramsWireframe />
      <ProgramDetailWireframe />
      <ArchiveWireframe />
      <JournalWireframe />
      <UIKit />
    </AppShell>
  );
}
