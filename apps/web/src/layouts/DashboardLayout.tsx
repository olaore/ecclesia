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
  X
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 glass z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center justify-between mb-8 px-2">
            <h1 className="text-2xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              Nehemiah
            </h1>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </Button>
          </div>

          <nav className="flex-1 space-y-1">
            {filteredNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                  location.pathname.startsWith(item.path)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setIsSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="pt-4 mt-4 border-t border-border">
            <div className="px-4 mb-4">
              <p className="text-sm font-medium truncate">{user?.fullName || user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="h-5 w-5 mr-3" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b flex items-center px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="ml-4 text-xl font-bold">Dashboard</h1>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
