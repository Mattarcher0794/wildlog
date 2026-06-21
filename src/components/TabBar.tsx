import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Camera, BookOpen, User } from "lucide-react";

const tabs = [
  { to: "/journal", label: "Journal", icon: BookOpen },
  { to: "/", label: "Log", icon: Camera },
  { to: "/map", label: "Map", icon: null },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function TabBar() {
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
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex">
            <Link
              to={to}
              aria-label={label}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[#F1EAD9]/90"
            >
              {Icon ? (
                <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
              ) : (
                <span className="h-6 w-6 shrink-0 rounded-full bg-white/90" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </motion.nav>
  );
}
