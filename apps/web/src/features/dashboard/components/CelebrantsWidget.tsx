import React, { useMemo, useState } from "react";
import {
  addMonths,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  setDate,
  setMonth,
  startOfWeek,
} from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { useCelebrants } from "../api/dashboardEndpoints";
import { Loader2, Cake, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Calendar } from "../../../components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

interface CelebrantData {
  id: string;
  fullName: string;
  celebrationType: "birthday" | "anniversary";
  type: string;
  month: number;
  day: number;
}

type ViewMode = "today" | "week" | "month";

export const CelebrantsWidget: React.FC = () => {
  const today = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const activeMonth = viewMode === "month" ? monthCursor : today;
  const { data: celebrants, isLoading, error } = useCelebrants(activeMonth.getMonth() + 1);

  const celebrantsWithDate = useMemo(() => {
    return (celebrants || []).map((celeb) => ({
      ...celeb,
      date: setDate(setMonth(new Date(activeMonth.getFullYear(), 0, 1), celeb.month - 1), celeb.day),
    }));
  }, [celebrants, activeMonth]);

  const weekCelebrants = useMemo(() => {
    const interval = {
      start: startOfWeek(today, { weekStartsOn: 1 }),
      end: endOfWeek(today, { weekStartsOn: 1 }),
    };

    return celebrantsWithDate.filter((celeb) => isWithinInterval(celeb.date, interval));
  }, [celebrantsWithDate, today]);

  const todayCelebrants = useMemo(
    () => celebrantsWithDate.filter((celeb) => isSameDay(celeb.date, today)),
    [celebrantsWithDate, today]
  );

  const celebrantsByDay = useMemo(() => {
    const grouped = new Map<string, CelebrantData[]>();

    celebrantsWithDate.forEach((celeb) => {
      const key = format(celeb.date, "yyyy-MM-dd");
      const group = grouped.get(key) || [];
      group.push(celeb);
      grouped.set(key, group);
    });

    return grouped;
  }, [celebrantsWithDate]);

  const selectedDayCelebrants = selectedDay
    ? celebrantsByDay.get(format(selectedDay, "yyyy-MM-dd")) || []
    : [];

  const monthDaySet = new Set(celebrantsWithDate.map((celeb) => format(celeb.date, "yyyy-MM-dd")));

  const listForMode = viewMode === "today" ? todayCelebrants : weekCelebrants;

  return (
    <Card className="col-span-1 flex h-[34rem] min-h-0 flex-col overflow-hidden border-white/70 bg-white/90">
      <CardHeader className="gap-3 border-b border-border/60 pb-4">
        <CardTitle>Birthdays & Anniversaries</CardTitle>
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
          <TabsList className="rounded-2xl bg-accent/70 p-1">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode === "month" ? (
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon-sm" onClick={() => setMonthCursor((prev) => addMonths(prev, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{format(monthCursor, "MMMM yyyy")}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setMonthCursor((prev) => addMonths(prev, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="min-h-0 flex-1 overflow-hidden px-4 pb-4 pt-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-destructive">
            Failed to load celebrants.
          </div>
        ) : viewMode === "month" ? (
          <div className="flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-border/70 bg-accent/18">
            <div className="min-h-0 flex-1 overflow-auto p-2">
              <Calendar
                month={monthCursor}
                onMonthChange={setMonthCursor}
                showOutsideDays={false}
                selected={selectedDay || undefined}
                disabled={(date) => !monthDaySet.has(format(date, "yyyy-MM-dd"))}
                modifiers={{
                  highlighted: (date) => monthDaySet.has(format(date, "yyyy-MM-dd")),
                }}
                modifiersClassNames={{
                  highlighted: "rounded-xl bg-secondary/12 text-foreground font-medium",
                }}
                onDayClick={(date) => {
                  if (!monthDaySet.has(format(date, "yyyy-MM-dd"))) return;
                  setSelectedDay(date);
                }}
                className="w-full"
                classNames={{
                  root: "w-full",
                  months: "w-full",
                  month: "w-full gap-3",
                  table: "w-full",
                  weekday: "text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground",
                  week: "mt-1.5 flex w-full",
                  day: "p-0.5",
                  day_button:
                    "relative h-10 w-full rounded-xl text-sm data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
                  today: "rounded-xl border border-secondary/25 bg-secondary/10 text-foreground",
                  disabled: "opacity-25",
                }}
              />
            </div>
            <p className="px-3 pb-2 text-xs text-muted-foreground">
              Select a highlighted day to view celebrants.
            </p>
          </div>
        ) : listForMode.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {viewMode === "today" ? "No celebrants today." : "No celebrants this week."}
          </div>
        ) : (
          <div className="h-full space-y-3 overflow-y-auto pr-1">
            {listForMode.map((celeb) => {
              const isBirthday = celeb.celebrationType === "birthday";
              const isToday = isSameDay(celeb.date, today);

              return (
                <div
                  key={`${celeb.id}-${celeb.celebrationType}`}
                  className={`group flex items-start space-x-3.5 rounded-[1.25rem] border p-4 transition-all duration-200 ${
                    isToday
                      ? "border-secondary/25 bg-secondary/10"
                      : "border-border/70 bg-accent/45 hover:bg-white hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
                  }`}
                >
                  <div className={`rounded-xl p-2.5 shrink-0 ${isBirthday ? "bg-primary/10 text-primary" : "bg-secondary/12 text-secondary"}`}>
                    {isBirthday ? <Cake className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold tracking-tight text-foreground/90">{celeb.fullName}</p>
                      {isToday ? <Badge variant="secondary">Today</Badge> : null}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge variant={isBirthday ? "default" : "secondary"} className="normal-case tracking-[0.08em]">
                        {isBirthday ? "Birthday" : "Anniversary"}
                      </Badge>
                    </div>
                  </div>
                  <div className="shrink-0 pr-1 pt-0.5 text-right">
                    <span className="text-lg font-medium tracking-tighter text-foreground/90">{format(celeb.date, "dd")}</span>
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                      {format(celeb.date, "MMM")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={Boolean(selectedDay)} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDay ? format(selectedDay, "EEEE, d MMMM") : "Celebrants"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedDayCelebrants.map((celeb) => (
              <div key={`${celeb.id}-${celeb.celebrationType}`} className="flex items-center justify-between rounded-2xl border border-border/70 bg-accent/40 px-4 py-3">
                <span className="font-medium text-foreground">{celeb.fullName}</span>
                <Badge variant={celeb.celebrationType === "birthday" ? "default" : "secondary"} className="normal-case tracking-[0.08em]">
                  {celeb.celebrationType === "birthday" ? "Birthday" : "Anniversary"}
                </Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
