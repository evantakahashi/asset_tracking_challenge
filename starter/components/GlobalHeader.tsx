"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getRole, type Role } from "@/lib/auth";
import { RoleSwitcher } from "./RoleSwitcher";
import { AudioToggle } from "./AudioToggle";

type NavItem = { href: string; label: string };

const TECH_NAV: NavItem[] = [
  { href: "/tech/receive", label: "Receive" },
  { href: "/tech/store", label: "Store" },
  { href: "/tech/deploy", label: "Deploy" },
  { href: "/tech/transfer", label: "Transfer" },
];

const MANAGER_NAV: NavItem[] = [
  { href: "/manager", label: "Directory" },
  { href: "/manager/reconcile", label: "Reconcile" },
];

const ROLE_USER_ID: Record<Role, string> = { tech: "tech-jane", manager: "manager-paul" };

function shortDate(d: Date): string {
  return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function GlobalHeader({ pathname: pathnameProp }: { pathname?: string }): React.ReactElement {
  const livePathname = usePathname();
  const pathname = pathnameProp ?? livePathname ?? "/";
  const [role, setRoleState] = useState<Role>("tech");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRoleState(getRole());
  }, [livePathname]);

  const effectiveRole: Role = mounted ? role : "tech";
  const nav = effectiveRole === "manager" ? MANAGER_NAV : TECH_NAV;

  function isActive(href: string): boolean {
    if (href === "/manager") return pathname === "/manager";
    return pathname.startsWith(href);
  }

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">Asset tracking</Link>
        <div className="flex items-center gap-2">
          <AudioToggle />
          <RoleSwitcher />
        </div>
      </div>
      <div className="bg-neutral-50 border-t border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 flex items-center">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={
                isActive(item.href)
                  ? "py-2.5 px-3 text-sm text-neutral-900 font-medium border-b-2 border-neutral-900 -mb-px"
                  : "py-2.5 px-3 text-sm text-neutral-500 hover:text-neutral-900 border-b-2 border-transparent -mb-px"
              }
            >
              {item.label}
            </Link>
          ))}
          <div className="flex-1" />
          <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-neutral-500 pr-1">
            {ROLE_USER_ID[effectiveRole]} · {shortDate(new Date())}
          </div>
        </div>
      </div>
    </header>
  );
}
