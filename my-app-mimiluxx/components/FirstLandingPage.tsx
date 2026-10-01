// components/LandingPage.tsx
export default function LandingPage() {
  const navLinks = ["features", "projects", "events", "resources"];

  return (
    // Top-Level Group: Light gray background
    <div className="min-h-screen bg-[#D0D1D2] flex flex-col items-center">
      
      {/* 1. Group: Navigation Bar */}
      <nav className="flex items-center gap-12 py-10 px-6">
        {navLinks.map((link) => (
          <a
            key={link}
            href={`#${link}`}
            // Light, semi-transparent text matching the wireframe
            className="text-white/80 hover:text-white text-base font-normal capitalize"
          >
            {link}
          </a>
        ))}
      </nav>

      {/* 2. Group: Main Hero Content (Centered) */}
      <main className="flex-grow flex flex-col items-center justify-center text-center px-6 mt-[-10vh]">
        {/* Main Bold Headline */}
        <h1 className="text-white text-5xl md:text-6xl font-black leading-tight max-w-5xl tracking-tight">
          sync your people, drive<br />
          your mission.
        </h1>

        {/* Thinner Subtext Headline */}
        <p className="mt-8 text-white/90 text-xl md:text-2xl font-normal max-w-3xl leading-snug">
          sync your people, drive your mission.
        </p>

        {/* 3. Group: Action Button */}
        <button className="mt-12 px-14 py-5 bg-[#595959] hover:bg-[#4a4a4a] text-white text-2xl font-bold rounded-[35px] shadow-sm transition-colors">
          Hop in!
        </button>
      </main>
    </div>
  );
}