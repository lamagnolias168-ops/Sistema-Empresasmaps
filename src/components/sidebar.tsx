"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, Target, Map, MessageSquare,
  Bot, Lightbulb, FileText, Settings, Menu, X, TrendingUp,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Prospectos", href: "/admin/prospectos", icon: Target },
  { label: "Mapa", href: "/admin/mapa", icon: Map },
  { label: "Agentes", href: "/admin/agentes", icon: Bot },
  { label: "Inteligencia", href: "/admin/inteligencia", icon: Lightbulb },
  { label: "Configuración", href: "/admin/configuracion", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f1d1d] text-white shadow-lg md:hidden active:scale-[0.97]"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
            />
            <motion.aside
              key="mobile-sidebar"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-[#0f1d1d] md:hidden"
            >
              <SidebarContent
                pathname={pathname}
                collapsed={false}
                onToggle={() => setMobileOpen(false)}
                isMobile
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ type: "spring", stiffness: 340, damping: 36 }}
        className="relative hidden h-full flex-col overflow-hidden border-r border-white/6 bg-[#0f1d1d] md:flex"
        style={{ flexShrink: 0 }}
      >
        <SidebarContent
          pathname={pathname}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          isMobile={false}
        />
      </motion.aside>
    </>
  );
}

interface SidebarContentProps {
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

function SidebarContent({ pathname, collapsed, onToggle, isMobile }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo + toggle */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-500 shadow-sm">
            <TrendingUp className="h-3.5 w-3.5 text-white" />
          </div>
          <span
            className="overflow-hidden whitespace-nowrap text-sm font-bold tracking-tight text-white transition-all duration-200"
            style={{ opacity: collapsed && !isMobile ? 0 : 1, maxWidth: collapsed && !isMobile ? 0 : 120 }}
          >
            codflow
          </span>
        </div>
        <button
          onClick={onToggle}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white/80 active:scale-[0.97]"
        >
          {isMobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Divider */}
      <div className="mx-3 h-px shrink-0 bg-white/6" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href + "/"));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed && !isMobile ? item.label : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 active:scale-[0.97] ${
                active
                  ? "bg-teal-500/18 text-teal-300"
                  : "text-white/55 hover:bg-white/7 hover:text-white/85"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  active
                    ? "text-teal-400"
                    : "text-white/45 group-hover:text-white/70"
                }`}
              />
              <span
                className="overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-200"
                style={{
                  opacity: collapsed && !isMobile ? 0 : 1,
                  maxWidth: collapsed && !isMobile ? 0 : 180,
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="shrink-0 overflow-hidden border-t border-white/6 px-4 py-3 transition-all duration-200"
        style={{ opacity: collapsed && !isMobile ? 0 : 1 }}
      >
        <p className="whitespace-nowrap text-[11px] text-white/25">Codflow Pro · v0.1</p>
      </div>
    </div>
  );
}
