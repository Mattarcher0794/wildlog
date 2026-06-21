import { Link, useRouterState } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { Camera, BookOpen, User } from "lucide-react";

const tabs = [
  { to: "/", label: "Log", icon: Camera },
  { to: "/journal", label: "Journal", icon: BookOpen },
  { to: "/map", label: "Map", icon: null },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function TabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduceMotion = useReducedMotion();

  return (
    <motion.nav
      aria-label="Primary"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 26, delay: 0.1 }}
      className="fixed inset-x-0 z-30 flex justify-center"
      style={{ bottom: "calc(20px + env(safe-area-inset-bottom))" }}
    >
      <ul
        className="flex w-[88%] max-w-md items-center justify-around rounded-full p-2"
        style={{
          backgroundColor: "rgba(62, 87, 65, 0.9)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          boxShadow: "0 12px 30px -8px rgba(0,0,0,0.2)",
        }}
      >
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex">
              <Link
                to={to}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-full"
                style={{
                  backgroundColor: active ? "#9CAF88" : "transparent",
                  color: active ? "#2B2620" : "rgba(241,234,217,0.9)",
                  transition: reduceMotion
                    ? "none"
                    : "background-color 200ms ease, padding 200ms ease",
                  paddingLeft: active ? 14 : 10,
                  paddingRight: active ? 14 : 10,
                }}
              >
                {Icon ? (
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                ) : (
                  <span
                    className="h-5 w-5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: active
                        ? "#2B2620"
                        : "rgba(255,255,255,0.9)",
                    }}
                  />
                )}
                {active && (
                  <span
                    className="overflow-hidden whitespace-nowrap text-[11px] font-semibold leading-none"
                    style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                  >
                    {label}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}
