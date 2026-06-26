import {
  createFileRoute,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/Brand";
import { TabBar } from "@/components/TabBar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedShell,
});

// Tab order left → right, mirrors the bottom nav.
const TAB_ORDER = ["/", "/life-list", "/map", "/profile"] as const;

function tabIndex(pathname: string): number {
  if (pathname === "/") return 0;
  const i = TAB_ORDER.findIndex((t) => t !== "/" && pathname.startsWith(t));
  return i === -1 ? 0 : i;
}

function isTabRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return TAB_ORDER.some((t) => t !== "/" && pathname.startsWith(t));
}

function AuthedShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduceMotion = useReducedMotion();

  const idx = tabIndex(pathname);
  const lastIndexRef = useRef(idx);
  const direction = idx >= lastIndexRef.current ? 1 : -1;
  lastIndexRef.current = idx;

  // Full-screen routes (e.g. username setup) opt out of the nav chrome.
  if (!isTabRoute(pathname)) {
    return <Outlet />;
  }

  // The Log tab gets a small "field journal" tagline pill; collection screens
  // carry their own large headers, so the pill would only add clutter there.
  const showPill = pathname === "/";



  const variants = {
    enter: (dir: number) =>
      reduceMotion
        ? { opacity: 0 }
        : { x: `${dir * 100}%`, opacity: 1 },
    center: reduceMotion ? { opacity: 1 } : { x: "0%", opacity: 1 },
    exit: (dir: number) =>
      reduceMotion
        ? { opacity: 0 }
        : { x: `${dir * -100}%`, opacity: 1 },
  };

  return (
    <>
      {/* overflow-x-hidden contains the horizontal slide transition. The TabBar
          must live OUTSIDE this wrapper: an overflow ancestor turns into a
          scroll container that breaks `position: fixed` on iOS Safari, making
          the nav scroll with the page instead of staying pinned. */}
      <div className="relative min-h-screen overflow-x-hidden">
        <header className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-6">
          <Wordmark />
          {showPill && (
            <span className="rounded-full border-[1.5px] border-border px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Field journal
            </span>
          )}
        </header>

        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={pathname}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>

      <TabBar />
    </>
  );
}
