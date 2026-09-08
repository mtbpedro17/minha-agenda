"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, ListChecks } from "lucide-react";

const TABS = [
  { href: "/", label: "Hoje", icon: Home },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/tarefas", label: "Tarefas", icon: ListChecks },
];

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 transition-colors"
            >
              <Icon
                size={22}
                strokeWidth={2}
                className={active ? "text-accent" : "text-muted"}
              />
              <span
                className={`text-xs font-medium ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
