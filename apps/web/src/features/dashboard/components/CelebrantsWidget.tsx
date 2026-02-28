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
          <div className="space-y-4">
            {celebrants.map((celeb: any) => {
              const isBirthday = celeb.celebrationType === "birthday";
              const dateObj = setDate(setMonth(new Date(), celeb.month - 1), celeb.day);

              return (
                <div
                  key={`${celeb.id}-${celeb.celebrationType}`}
                  className="flex items-start space-x-3 p-3 rounded-xl bg-card border hover:border-primary/50 transition-colors"
                >
                  <div className={`p-2 rounded-lg shrink-0 ${isBirthday ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                    {isBirthday ? <Cake className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{celeb.fullName}</p>
                    <p className="text-xs text-muted-foreground capitalize flex items-center space-x-1 mt-0.5">
                      <span>{celeb.type.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>{isBirthday ? "Birthday" : "Anniversary"}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-center shrink-0 text-right">
                    <span className="text-lg font-bold leading-none">{format(dateObj, "dd")}</span>
                    <span className="text-xs text-muted-foreground uppercase">{format(dateObj, "MMM")}</span>
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
