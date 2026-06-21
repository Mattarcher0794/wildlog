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
const TAB_ORDER = ["/", "/journal", "/map", "/profile"] as const;

function tabIndex(pathname: string): number {
  if (pathname === "/") return 0;
  const i = TAB_ORDER.findIndex((t) => t !== "/" && pathname.startsWith(t));
  return i === -1 ? 0 : i;
}

function AuthedShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduceMotion = useReducedMotion();

  const idx = tabIndex(pathname);
  const lastIndexRef = useRef(idx);
  const direction = idx >= lastIndexRef.current ? 1 : -1;
  lastIndexRef.current = idx;

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

      <TabBar />
    </div>
  );
}
