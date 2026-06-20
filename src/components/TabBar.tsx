import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Camera, BookOpen } from "lucide-react";

const tabs = [
  { to: "/", label: "Identify", icon: Camera },
  { to: "/history", label: "Journal", icon: BookOpen },
] as const;

export function TabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <motion.nav
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.15 }}
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-card/90 p-1.5 shadow-lg backdrop-blur">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className="relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span
                className={`relative z-10 flex items-center gap-2 ${
                  active ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
