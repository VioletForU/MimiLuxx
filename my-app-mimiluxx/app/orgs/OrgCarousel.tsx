"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

export type OrgCard = { id: string; name: string; slug: string };

const MIN_SCALE = 0.54;
const FALLBACK_ART =
  "data:image/svg+xml;utf8," +
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'>" +
  "<g fill='%23ffffff' fill-opacity='.85'><circle cx='100' cy='72' r='42'/>" +
  "<path d='M28 300c0-84 32-152 72-152s72 68 72 152z'/></g></svg>";

export default function OrgCarousel({ orgs }: { orgs: OrgCard[] }) {
  const track = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const raf = useRef(0);
  const [active, setActive] = useState(Math.min(1, orgs.length - 1));

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const centre = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    slots.current.forEach((slot, i) => {
      if (!slot) return;
      const d = Math.abs(slot.offsetLeft + slot.offsetWidth / 2 - centre) / slot.offsetWidth;
      const s = 1 - Math.min(d, 1) * (1 - MIN_SCALE);
      slot.style.setProperty("--s", s.toFixed(3));
      slot.style.zIndex = String(Math.round(s * 10));
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActive(best);
  }, []);

  const goTo = useCallback(
    (i: number, behavior: ScrollBehavior = "smooth") => {
      const el = track.current;
      const slot = slots.current[Math.max(0, Math.min(orgs.length - 1, i))];
      if (!el || !slot) return;
      el.scrollTo({ left: slot.offsetLeft + slot.offsetWidth / 2 - el.clientWidth / 2, behavior });
    },
    [orgs.length]
  );

  useEffect(() => {
    goTo(Math.min(1, orgs.length - 1), "instant");
    update();
    const onResize = () => {
      goTo(active, "instant");
      update();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(active + 1);
      if (e.key === "ArrowLeft") goTo(active - 1);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf.current);
    };
  }, [active, goTo, update, orgs.length]);

  return (
    <main className="org-carousel relative mt-[clamp(0.5rem,3vh,2.5rem)]">
      <section className="relative" aria-label="Choose an organization" aria-roledescription="carousel">
        <button
          type="button"
          aria-label="Previous organization"
          disabled={active === 0}
          onClick={() => goTo(active - 1)}
          className="carousel-arrow absolute left-[clamp(1rem,3vw,3rem)] top-[62%] z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-[0_6px_20px_rgba(0,0,0,0.25)]"
        >
          ‹
        </button>

        <div
          ref={track}
          className="carousel-track"
          tabIndex={-1}
          onScroll={() => {
            cancelAnimationFrame(raf.current);
            raf.current = requestAnimationFrame(update);
          }}
        >
          {orgs.map((org, i) => (
            <div
              key={org.id}
              ref={(el) => {
                slots.current[i] = el;
              }}
              className="carousel-slot"
              style={{ ["--i" as string]: i }}
            >
              {/* Cards open the task page for now: tasks are not scoped to an org yet. */}
              <Link href="/tasks" className="org-card" aria-label={org.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="org-card__art" src={FALLBACK_ART} alt="" />
                <span className="org-card__name">{org.name}</span>
              </Link>
            </div>
          ))}
        </div>

        <button
          type="button"
          aria-label="Next organization"
          disabled={active === orgs.length - 1}
          onClick={() => goTo(active + 1)}
          className="carousel-arrow absolute right-[clamp(1rem,3vw,3rem)] top-[62%] z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-[0_6px_20px_rgba(0,0,0,0.25)]"
        >
          ›
        </button>
      </section>
    </main>
  );
}
