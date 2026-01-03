"use client";

import Image from "next/image";
import { Users, Search, FileText, Settings, ChevronLeft, ChevronRight, Moon, Sun, BarChart } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  isHrUser?: boolean;
}

const navItems = [
  { key: "upload", name: "Upload", icon: FileText },
  { key: "candidates", name: "Candidates", icon: Users },
  { key: "search", name: "Smart Search", icon: Search },
  { key: "jd-generator", name: "JD Generator", icon: FileText },
  { key: "analytics", name: "My Analytics", icon: BarChart, isHrOnly: true },
  { key: "admin", name: "Admin", icon: Settings },
];

export default function Sidebar({ activeSection, setActiveSection, isHrUser = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Always set light mode on mount
    document.documentElement.classList.remove("dark");
    setIsDark(false);
  }, []);

  const toggleDark = () => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  };

  const handleLogout = () => {
    document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "hr_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    router.push("/login");
  };

  const logoSrc = isDark
    ? "https://i.postimg.cc/3x2xmLqs/log-def.png"
    : "https://i.postimg.cc/D0W2Z5sY/log0-def.png";

  return (
    <aside
      className={`sticky top-0 h-screen flex flex-col transition-all duration-200 z-30 ${
        collapsed
          ? 'w-20 bg-white dark:bg-[#18181b] border-r border-zinc-200 dark:border-zinc-800'
          : 'w-64 bg-white dark:bg-[#18181b] border-r border-zinc-200 dark:border-zinc-800'
      }`}
    >
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center">
          <Image src={logoSrc} alt="Truckinzy Logo" width={150} height={80} priority />
        </div>
        <button
          className="ml-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      <nav className="flex-1 mt-8">
        <ul className="space-y-2">
          {navItems.map((item) => {
            if ((item as any).isHrOnly && !isHrUser) return null;
            const Icon = item.icon;
            const isActive = activeSection === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => setActiveSection(item.key)}
                  className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors group focus:outline-none ${
                    isActive
                      ? "bg-blue-100 text-blue-700 font-semibold dark:bg-blue-900/60 dark:text-blue-200"
                      : "text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Icon className="mr-3" size={22} />
                  {!collapsed && <span>{item.name}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto p-4 flex flex-col items-center gap-2">
        <button
          onClick={toggleDark}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 transition-colors shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
        >
          {isDark ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-blue-500" />}
          {!collapsed && <span>{isDark ? "Light Mode" : "Dark Mode"}</span>}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 transition-colors shadow-sm focus:ring-2 focus:ring-red-400 focus:outline-none w-full justify-center mt-2"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
