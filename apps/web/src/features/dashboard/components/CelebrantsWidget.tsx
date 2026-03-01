import React, { useState } from "react";
import { format, setMonth, setDate } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { useCelebrants } from "../api/dashboardEndpoints";
import { Loader2, Cake, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../../components/ui/button";

interface CelebrantData {
  id: string;
  fullName: string;
  celebrationType: "birthday" | "anniversary";
  type: string;
  month: number;
  day: number;
}

export const CelebrantsWidget: React.FC = () => {
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const { data: celebrants, isLoading, error } = useCelebrants(selectedMonth);

  const handlePrevMonth = () => {
    setSelectedMonth((prev) => (prev === 1 ? 12 : prev - 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => (prev === 12 ? 1 : prev + 1));
  };

  const monthName = format(setMonth(new Date(), selectedMonth - 1), "MMMM");

  return (
    <Card className="glass shadow-xl col-span-1 flex flex-col h-full border-white/5">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle>Celebrants</CardTitle>
          <CardDescription>Birthdays & Anniversaries</CardDescription>
        </div>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-20 text-center">{monthName}</span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-destructive text-sm text-center py-8">
            Failed to load celebrants.
          </div>
        ) : !celebrants || celebrants.length === 0 ? (
          <div className="text-muted-foreground text-sm text-center py-8">
            No celebrants in {monthName}.
          </div>
        ) : (
          <div className="space-y-3">
            {celebrants.map((celeb: CelebrantData) => {
              const isBirthday = celeb.celebrationType === "birthday";
              const dateObj = setDate(setMonth(new Date(), celeb.month - 1), celeb.day);

              return (
                <div
                  key={`${celeb.id}-${celeb.celebrationType}`}
                  className="group flex items-start space-x-3.5 p-3.5 rounded-2xl bg-white/40 border border-white/60 hover:bg-white/80 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 ease-out"
                >
                  <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${isBirthday ? 'bg-primary/10 text-primary group-hover:bg-primary/20' : 'bg-secondary/10 text-secondary group-hover:bg-secondary/20'}`}>
                    {isBirthday ? <Cake className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm font-semibold tracking-tight truncate text-foreground/90">{celeb.fullName}</p>
                    <p className="text-xs font-medium text-muted-foreground/80 capitalize flex items-center space-x-1.5 mt-0.5">
                      <span>{celeb.type.replace('_', ' ')}</span>
                      <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50"></span>
                      <span>{isBirthday ? "Birthday" : "Anniversary"}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-center shrink-0 text-right pt-0.5 pr-1">
                    <span className="text-lg font-medium tabular-nums tracking-tighter leading-none text-foreground/90">{format(dateObj, "dd")}</span>
                    <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest mt-1">{format(dateObj, "MMM")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
