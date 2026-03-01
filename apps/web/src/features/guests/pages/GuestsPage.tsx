import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GuestForm } from "../components/GuestForm";
import { Button } from "../../../components/ui/button";
import { QrCode, ClipboardList, Loader2, UserPlus } from "lucide-react";
import { apiClient } from "../../../lib/api";
import { Guest } from "@nehemiah/core/schemas";

export const GuestsPage: React.FC = () => {
  const [view, setView] = useState<"list" | "form">("list");

  const { data: guests, isLoading, error } = useQuery({
    queryKey: ["guests"],
    queryFn: async () => {
      const response = await apiClient<{ data: Guest[] }>("/guests");
      return response.data;
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">First-Time Guests</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track visitors and promote them to full members.
          </p>
        </div>
        <div className="flex space-x-2">
          {view === "list" ? (
            <Button onClick={() => setView("form")} variant="secondary">
              <QrCode className="mr-2 h-4 w-4" />
              Open Quick Form
            </Button>
          ) : (
            <Button onClick={() => setView("list")} variant="outline">
              <ClipboardList className="mr-2 h-4 w-4" />
              View Guest List
            </Button>
          )}
        </div>
      </div>

      {view === "form" ? (
        <div className="animate-in zoom-in-95 duration-300 py-8">
          <GuestForm />
        </div>
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <div className="glass p-12 flex justify-center items-center rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="glass p-8 text-center text-destructive rounded-xl">
              Failed to load guests.
            </div>
          ) : !guests || guests.length === 0 ? (
            <div className="glass p-8 text-center rounded-xl border border-dashed border-muted-foreground/30">
              <h3 className="text-lg font-medium text-foreground">Guest Tracker Empty</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                Switch to the quick form to log new visitors, or have them scan a QR code holding the public link.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {guests.map((guest) => (
                <div key={guest.id} className="glass p-5 rounded-2xl border-white/60 bg-white/40 flex flex-col hover:bg-white/80 hover:shadow-lg hover:shadow-secondary/5 hover:-translate-y-1 transition-all duration-300 ease-out">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-12 w-12 bg-secondary/10 text-secondary rounded-full flex items-center justify-center shrink-0 ring-4 ring-white">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground tracking-tight leading-none">{guest.fullName}</p>
                      <p className="text-xs font-medium text-secondary mt-1 capitalize px-2 py-0.5 bg-secondary/10 rounded-full inline-block">
                        {guest.status.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm space-y-1 text-muted-foreground/90 mt-auto pt-3 border-t border-slate-100">
                    <p className="flex justify-between"><span>Email:</span> <span className="text-foreground truncate ml-2">{guest.email || "N/A"}</span></p>
                    <p className="flex justify-between"><span>Phone:</span> <span className="text-foreground">{guest.phone || "N/A"}</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
