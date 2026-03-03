import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { useAttendanceTrends } from "../api/dashboardEndpoints";
import { Loader2, TrendingUp } from "lucide-react";

const chartColors = {
  sunday: "hsl(224 42% 22%)",
  midweek: "hsl(24 78% 50%)",
  grid: "hsl(220 10% 76% / 0.28)",
  text: "hsl(220 12% 42%)",
  tooltipBg: "rgba(255, 255, 255, 0.96)",
  tooltipBorder: "rgba(219, 211, 201, 0.9)",
};

export const AttendanceTrendsCard: React.FC = () => {
  const { data: trends, isLoading, error } = useAttendanceTrends();

  return (
    <Card className="col-span-1 h-136 min-h-0 border-white/70 bg-white/90 lg:col-span-2">
      <CardHeader className="border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle>Attendance trends</CardTitle>
            <CardDescription>
              Sunday and midweek averages by month.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px] flex items-center justify-center">
        {isLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : error ? (
          <div className="text-destructive text-sm text-center">
            Failed to load attendance trends.
          </div>
        ) : !trends || trends.length === 0 ? (
          <div className="text-muted-foreground text-sm text-center">
            No attendance data available yet.
          </div>
        ) : (
          <div className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trends}
                margin={{
                  top: 20,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartColors.text, fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartColors.text, fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(244, 238, 231, 0.8)" }}
                  contentStyle={{
                    backgroundColor: chartColors.tooltipBg,
                    borderColor: chartColors.tooltipBorder,
                    borderRadius: "1rem",
                    boxShadow: "0 16px 38px rgba(15, 23, 42, 0.12)",
                  }}
                  itemStyle={{ color: "hsl(224 30% 16%)" }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "20px" }}
                  iconType="circle"
                />
                <Bar
                  dataKey="sundayAvg"
                  name="Sunday"
                  fill={chartColors.sunday}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="midweekAvg"
                  name="Midweek"
                  fill={chartColors.midweek}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
