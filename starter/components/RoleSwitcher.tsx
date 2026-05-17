"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRole, setRole, type Role } from "@/lib/auth";

export function RoleSwitcher() {
  const router = useRouter();
  const [role, setRoleState] = useState<Role>("tech");

  useEffect(() => {
    setRoleState(getRole());
  }, []);

  function handleClick(): void {
    const next: Role = role === "tech" ? "manager" : "tech";
    setRole(next);
    setRoleState(next);
    router.push(next === "tech" ? "/tech" : "/manager");
    router.refresh();
  }

  const label =
    role === "tech" ? "Switch to manager view" : "Switch to tech view";

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-neutral-50 min-h-[36px]"
      aria-label={label}
    >
      <span className="text-gray-500 mr-2">role: {role}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}
