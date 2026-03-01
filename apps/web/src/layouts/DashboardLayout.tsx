import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Calendar,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuthStore } from "../store/useAuthStore";
import { Button } from "../components/ui/button";

/**
 * DashboardLayout provides the main application structure with a 
 * responsive sidebar and a content area.
 */
export const DashboardLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", roles: ["sysadmin", "superadmin", "admin"] },
    { label: "Members", icon: Users, path: "/members", roles: ["sysadmin", "superadmin", "admin"] },
    { label: "Guests", icon: UserPlus, path: "/guests", roles: ["sysadmin", "superadmin", "admin"] },
    { label: "Attendance", icon: BarChart3, path: "/attendance", roles: ["sysadmin", "superadmin", "admin"] },
    { label: "Events", icon: Calendar, path: "/events", roles: ["sysadmin", "superadmin", "admin"] },
  ];

  const filteredNavItems = navItems.filter(item =>
    !item.roles || (user && item.roles.includes(user.role))
  );
  const activeItem = filteredNavItems.find((item) => location.pathname.startsWith(item.path));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/28 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-0 px-0 lg:px-4 xl:px-6">
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:py-4",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="surface-card flex h-full min-h-0 flex-col rounded-none border-y-0 border-l-0 border-r lg:h-[calc(100vh-2rem)] lg:rounded-[1.75rem] lg:border lg:bg-white/72">
            <div className="flex items-start justify-between border-b border-border/70 px-4 pb-4 pt-5">
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-secondary">
                  Church Office
                </p>
                <h1 className="text-[1.45rem] font-semibold tracking-[-0.04em] text-foreground">
                  Nehemiah
                </h1>
              </div>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 px-3 py-4">
              <p className="px-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Workspace
              </p>
              <nav className="mt-2.5 space-y-1">
                {filteredNavItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "group flex items-center justify-between rounded-2xl px-2.5 py-2.5 text-sm transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-[0_6px_16px_rgba(37,52,90,0.12)]"
                          : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                      )}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <span className="flex items-center gap-3">
                        <span className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                          isActive
                            ? "border-white/15 bg-white/10 text-white"
                            : "border-border/70 bg-white/70 text-muted-foreground group-hover:border-secondary/20 group-hover:text-foreground"
                        )}>
                          <item.icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="font-medium">{item.label}</span>
                      </span>
                      <ChevronRight className={cn("h-4 w-4 transition-transform", isActive ? "opacity-100" : "opacity-0 group-hover:translate-x-0.5 group-hover:opacity-70")} />
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="mt-auto border-t border-border/70 p-3">
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-white/65 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{user?.fullName || user?.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/60 bg-background/85 backdrop-blur-xl lg:hidden">
            <div className="flex h-16 items-center justify-between px-4">
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Nehemiah
                </p>
                <h2 className="text-sm font-semibold text-foreground">
                  {activeItem?.label || "Dashboard"}
                </h2>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 sm:px-5 sm:py-6 lg:px-6 lg:py-8 xl:px-8">
            <div className="mx-auto w-full max-w-7xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
