import React from "react";
import { useAuthStore } from "../../../store/useAuthStore";
import { AttendanceTrendsCard } from "../components/AttendanceTrendsCard";
import { CelebrantsWidget } from "../components/CelebrantsWidget";

export const DashboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const firstName = user?.fullName?.split(" ")[0] || "Admin";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back, {firstName}!</h2>
          <p className="text-muted-foreground mt-1 text-base">
            Here's what's happening at the church this month.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analytics Main Panel */}
        <AttendanceTrendsCard />

        {/* Side Panel for Event Snippets */}
        <CelebrantsWidget />
      </div>
    </div>
  );
};
