import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AttendanceForm } from "../components/AttendanceForm";
import { Button } from "../../../components/ui/button";
import { BarChart2, Loader2, Plus, Calendar } from "lucide-react";
import { apiClient } from "../../../lib/api";
import { AttendanceEvent } from "@nehemiah/core/schemas";
import { formatDateOnly } from "../../../lib/date";

export const AttendancePage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);

  const { data: attendanceLogs, isLoading, error } = useQuery({
    queryKey: ["attendance"],
    queryFn: async () => {
      const response = await apiClient<{ data: AttendanceEvent[] }>("/attendance");
      return response.data;
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Service Attendance</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Log and review headcount data across all services and events.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? "Cancel Logging" : "Log Attendance"}
        </Button>
      </div>

      {showForm && (
        <div className="animate-in slide-in-from-top-4 duration-300">
          <AttendanceForm />
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">Recent Logs</h3>

        {isLoading ? (
          <div className="glass p-12 flex justify-center items-center rounded-xl">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="glass p-8 text-center text-destructive rounded-xl">
            Failed to load attendance logs.
          </div>
        ) : !attendanceLogs || attendanceLogs.length === 0 ? (
          <div className="glass p-8 text-center rounded-xl border border-dashed border-muted-foreground/30 flex flex-col items-center">
            <div className="bg-primary/10 p-3 rounded-full mb-3 text-primary">
              <BarChart2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No Logs Yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Start tracking by clicking "Log Attendance" above to log Sunday services and midweek meetings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attendanceLogs.map((log) => (
              <div key={log.id || Math.random().toString()} className="glass p-5 rounded-2xl shadow-sm border border-white/60 bg-white/40 flex flex-col hover:bg-white/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 ease-out">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 ring-4 ring-white">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground tracking-tight leading-none capitalize">
                      {log.eventType.replace("_", " ")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDateOnly(log.eventDate)}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-slate-100 flex items-end justify-between">
                  <div className="text-sm text-muted-foreground">
                    <p>Adults: <span className="text-foreground font-medium">{log.adultsCount ?? "-"}</span></p>
                    <p>Children: <span className="text-foreground font-medium">{log.childrenCount ?? "-"}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Total</p>
                    <p className="text-2xl font-bold tracking-tight leading-none text-primary">{log.headcount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
