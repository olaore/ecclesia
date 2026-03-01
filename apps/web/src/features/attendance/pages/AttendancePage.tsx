import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AttendanceForm } from "../components/AttendanceForm";
import { Button } from "../../../components/ui/button";
import { BarChart2, Loader2, Plus } from "lucide-react";
import { apiClient } from "../../../lib/api";
import { AttendanceEvent } from "@nehemiah/core/schemas";
import { formatDateOnly } from "../../../lib/date";
import { PageHeader } from "../../../components/app/PageHeader";
import { Badge } from "../../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { AttendanceTrendsCard } from "../../dashboard/components/AttendanceTrendsCard";

export const AttendancePage: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: attendanceLogs, isLoading, error } = useQuery({
    queryKey: ["attendance"],
    queryFn: async () => {
      const response = await apiClient<{ data: AttendanceEvent[] }>("/attendance");
      return response.data;
    },
  });

  const sortedLogs = useMemo(
    () =>
      attendanceLogs
        ? [...attendanceLogs].sort(
            (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
          )
        : [],
    [attendanceLogs]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attendance"
        title="Service headcount"
        description="Attendance log."
        actions={
          <Button size="lg" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Log attendance
          </Button>
        }
      />

      <div className="space-y-4">
        <AttendanceTrendsCard />

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">Recent log</h3>
          <Badge variant="outline">{sortedLogs.length} entries</Badge>
        </div>

        {isLoading ? (
          <div className="surface-card flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="surface-card rounded-xl p-8 text-center text-destructive">
            Failed to load attendance logs.
          </div>
        ) : sortedLogs.length === 0 ? (
          <div className="surface-card flex flex-col items-center rounded-xl border border-dashed border-muted-foreground/30 p-8 text-center">
            <div className="mb-3 rounded-full bg-primary/10 p-3 text-primary">
              <BarChart2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No logs yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Record a service or event headcount to start the attendance log.
            </p>
          </div>
        ) : (
          <div className="surface-card overflow-hidden p-2 sm:p-3">
            <Table>
              <TableHeader className="bg-accent/45">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Adults</TableHead>
                  <TableHead>Children</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLogs.map((log) => (
                  <TableRow key={log.id ?? `${log.eventType}-${log.eventDate}`}>
                    <TableCell className="font-medium text-foreground">
                      {formatDateOnly(log.eventDate)}
                    </TableCell>
                    <TableCell className="capitalize">{log.eventType.replace("_", " ")}</TableCell>
                    <TableCell>
                      <span className="text-2xl font-semibold leading-none text-primary">{log.headcount}</span>
                    </TableCell>
                    <TableCell>{log.adultsCount ?? "-"}</TableCell>
                    <TableCell>{log.childrenCount ?? "-"}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-muted-foreground">
                      {log.notes || ".."}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log attendance</DialogTitle>
            <DialogDescription>Attendance entry.</DialogDescription>
          </DialogHeader>
          <AttendanceForm onDone={() => setIsCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
