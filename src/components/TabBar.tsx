import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Camera, BookOpen, User } from "lucide-react";

import { BlobPin } from "@/components/Brand";

const tabs = [
  { to: "/", label: "Log", icon: Camera },
  { to: "/journal", label: "Journal", icon: BookOpen },
  { to: "/map", label: "Map", icon: null },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function TabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 26, delay: 0.1 }}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {Icon ? (
                  <Icon className="h-[18px] w-[18px]" />
                ) : (
                  <BlobPin />
                )}
                <span className="text-[11px] font-medium leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}
