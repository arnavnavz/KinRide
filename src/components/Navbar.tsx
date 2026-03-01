"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { Avatar } from "@/components/Avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggleButton } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n-context";

function NavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`transition-colors ${
        isActive
          ? "text-primary font-medium"
          : "text-gray-600 hover:text-primary"
      }`}
    >
      {children}
    </Link>
  );
}

export function Navbar() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/chats/unread");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count || 0);
        }
      } catch { /* ignore */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10_000);
    return () => clearInterval(interval);
  }, [session?.user]);

  if (!session?.user) return null;

  const isDriver = session.user.role === "DRIVER";
  const chatsHref = isDriver ? "/driver/chats" : "/rider/chats";
  const closeMenu = () => setMenuOpen(false);

  const navLinks = (
    <>
      {!isDriver && (
        <>
          <NavLink href="/rider/request" onClick={closeMenu}>{t("nav.request_ride")}</NavLink>
          <NavLink href="/rider/kin" onClick={closeMenu}>{t("nav.my_kin")}</NavLink>
          <NavLink href="/rider/history" onClick={closeMenu}>Ride History</NavLink>
          <NavLink href="/rider/promos" onClick={closeMenu}>Promos</NavLink>
        </>
      )}
      {isDriver && (
        <>
          <NavLink href="/driver/dashboard" onClick={closeMenu}>{t("driver.dashboard")}</NavLink>
          <NavLink href="/driver/earnings" onClick={closeMenu}>{t("driver.earnings")}</NavLink>
          <NavLink href="/driver/analytics" onClick={closeMenu}>{t("driver.analytics")}</NavLink>
          <NavLink href="/driver/history" onClick={closeMenu}>Ride History</NavLink>
        </>
      )}
      {session.user.role === "ADMIN" && (
        <NavLink href="/admin" onClick={closeMenu}>Admin</NavLink>
      )}
      <NavLink href={chatsHref} onClick={closeMenu}>
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {t("nav.chats")}
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-fade-in-scale">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </span>
      </NavLink>
    </>
  );

  return (
    <nav className="bg-white/80 dark:bg-card/80 backdrop-blur-lg border-b border-gray-200/60 dark:border-card-border sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={isDriver ? "/driver/dashboard" : "/rider/request"} className="flex items-center gap-1.5">
          <span className="text-xl font-bold text-primary">Ka</span>
          <span className="text-xl font-light text-foreground">yu</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          {navLinks}
          <div className="flex items-center gap-3 ml-2 pl-4 border-l border-gray-200">
            <NotificationBell />
            <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Avatar name={session.user.name || "U"} size="xs" />
              <span className="text-gray-500 text-xs">
                {session.user.name}
                <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] uppercase font-medium">
                  {session.user.role}
                </span>
              </span>
            </Link>
            <ThemeToggleButton />
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-gray-400 hover:text-danger transition-colors"
            >
              {t("nav.sign_out")}
            </button>
            <LanguageSwitcher compact />
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 text-gray-600 hover:text-primary transition-colors"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-lg px-4 pb-4 pt-2 space-y-3 text-sm shadow-lg animate-slide-down">
          {navLinks}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <Link href="/profile" onClick={closeMenu} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Avatar name={session.user.name || "U"} size="xs" />
              <span className="text-gray-500 text-xs">
                {session.user.name}
                <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] uppercase font-medium">
                  {session.user.role}
                </span>
              </span>
            </Link>
            <ThemeToggleButton />
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-gray-400 hover:text-danger transition-colors text-xs"
            >
              {t("nav.sign_out")}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
