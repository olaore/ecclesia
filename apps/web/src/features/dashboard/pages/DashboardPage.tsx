import React from "react";
import { useAuthStore } from "../../../store/useAuthStore";
import { AttendanceTrendsCard } from "../components/AttendanceTrendsCard";
import { CelebrantsWidget } from "../components/CelebrantsWidget";
import { PageHeader } from "../../../components/app/PageHeader";

export const DashboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const firstName = user?.fullName?.split(" ")[0] || "Admin";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title={`Welcome back, ${firstName}.`}
        description="Dashboard overview."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
        <AttendanceTrendsCard />
        <CelebrantsWidget />
      </div>
    </div>
  );
};
