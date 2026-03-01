import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EventForm } from "../components/EventForm";
import { Button } from "../../../components/ui/button";
import { Calendar as CalendarIcon, Loader2, Plus, Clock, Globe, Lock } from "lucide-react";
import { apiClient } from "../../../lib/api";
import { ChurchEvent } from "@nehemiah/core/schemas";
import { format } from "date-fns";

export const EventsPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Church Calendar</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage upcoming services, special programs, and department meetings.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? "Close Scheduler" : "Schedule Event"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Calendar UI / List */}
        <div className={`space-y-4 ${showForm ? "lg:col-span-2" : "lg:col-span-3"}`}>

          <div className="glass p-6 sm:p-8 rounded-2xl border border-white/60 min-h-[400px]">
            <h3 className="text-lg font-semibold tracking-tight mb-4 text-foreground flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-primary" />
              Upcoming Schedule
            </h3>

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
                <p className="text-muted-foreground">The calendar is currently empty.</p>
                <p className="text-sm text-muted-foreground/80 mt-1">Click 'Schedule Event' to add a new program.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedEvents.map((event) => {
                  const sDate = new Date(event.startDate);
                  const eDate = new Date(event.endDate);

                  return (
                    <div key={event.id} className="group relative flex flex-col sm:flex-row gap-5 p-5 rounded-2xl border border-white/40 bg-white/40 hover:bg-white/80 hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 ease-out">
                      {/* Date Block */}
                      <div className="flex flex-col items-center justify-center min-w-16 px-2 py-1 bg-primary/5 rounded-lg text-primary self-start sm:self-center">
                        <span className="text-xs font-semibold uppercase tracking-wider">{format(sDate, "MMM")}</span>
                        <span className="text-3xl font-black leading-none my-0.5">{format(sDate, "dd")}</span>
                      </div>

                      {/* Content */}
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
                          {event.description || "No description provided."}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground/80">
                          <span className="flex items-center gap-1 text-secondary bg-secondary/10 px-2 py-0.5 rounded capitalize">
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

        {/* Right Column: Dynamic Form Widget */}
        {showForm && (
          <div className="lg:col-span-1 animate-in slide-in-from-right-4 duration-300">
            <div className="sticky top-6">
              <EventForm />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
