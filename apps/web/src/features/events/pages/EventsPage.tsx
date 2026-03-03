import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EventForm } from "../components/EventForm";
import { Button } from "../../../components/ui/button";
import { Calendar as CalendarIcon, Loader2, Plus, Clock, Globe, Lock } from "lucide-react";
import { apiClient } from "../../../lib/api";
import { ChurchEvent } from "@nehemiah/core/schemas";
import { format } from "date-fns";
import { PageHeader } from "../../../components/app/PageHeader";
import { Badge } from "../../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

export const EventsPage: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: events, isLoading, error } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const response = await apiClient<{ data: ChurchEvent[] }>("/events");
      return response.data;
    },
  });

  // Sort events chronologically
  const sortedEvents = events ? [...events].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calendar"
        title="Upcoming schedule"
        description="Church calendar."
        actions={
          <Button size="lg" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Schedule event
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          <div className="surface-card min-h-[400px] p-6 sm:p-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="flex items-center text-lg font-semibold tracking-tight text-foreground">
                <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                Upcoming schedule
              </h3>
              <Badge variant="outline">{sortedEvents.length} events</Badge>
            </div>

            {isLoading ? (
              <div className="h-64 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="h-64 flex justify-center items-center text-destructive">
                Failed to load calendar events.
              </div>
            ) : sortedEvents.length === 0 ? (
              <div className="h-64 flex flex-col justify-center items-center text-center">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                  <CalendarIcon className="h-8 w-8 text-primary opacity-50" />
                </div>
                <p className="text-muted-foreground">No upcoming events yet.</p>
                <p className="mt-1 text-sm text-muted-foreground/80">Use Schedule event to add the next service, program, or meeting.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedEvents.map((event) => {
                  const sDate = new Date(event.startDate);
                  const eDate = new Date(event.endDate);

                  return (
                    <div key={event.id} className="group relative flex flex-col gap-5 rounded-3xl border border-border/70 bg-accent/40 p-5 transition-all duration-200 hover:bg-white hover:shadow-[0_6px_16px_rgba(15,23,42,0.05)] sm:flex-row">
                      <div className="flex min-w-16 flex-col items-center justify-center self-start rounded-xl bg-primary/6 px-3 py-2 text-primary sm:self-center">
                        <span className="text-xs font-semibold uppercase tracking-wider">{format(sDate, "MMM")}</span>
                        <span className="text-3xl font-black leading-none my-0.5">{format(sDate, "dd")}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-md">{event.title}</h4>
                          {event.visibility === "public" ? (
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Lock className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {event.description || "No additional notes attached to this event yet."}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground/80">
                          <span className="flex items-center gap-1 rounded-full bg-secondary/12 px-2.5 py-1 text-secondary capitalize">
                            {event.eventType.replace("_", " ")}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {format(sDate, "h:mm a")} - {format(eDate, "h:mm a")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule event</DialogTitle>
            <DialogDescription>Calendar entry.</DialogDescription>
          </DialogHeader>
          <EventForm onDone={() => setIsCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
