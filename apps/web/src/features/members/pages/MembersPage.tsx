import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MemberForm } from "../components/MemberForm";
import { Button } from "../../../components/ui/button";
import { Plus, User, Loader2 } from "lucide-react";
import { apiClient } from "../../../lib/api";
import { Member } from "@nehemiah/core/schemas";
// We mock the dialog since we don't have shadcn dialog installed yet, we'll install it or just use a conditional render

export const MembersPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);

  const { data: members, isLoading, error } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const response = await apiClient<{ data: Member[] }>("/members");
      return response.data;
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Members Directory</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the congregation, update profiles, and assign departments.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? "Cancel" : "Add New Member"}
        </Button>
      </div>

      {showForm ? (
        <div className="animate-in slide-in-from-top-4 duration-300">
          <MemberForm />
        </div>
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <div className="glass p-12 flex justify-center items-center rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="glass p-8 text-center text-destructive rounded-xl">
              Failed to load members.
            </div>
          ) : !members || members.length === 0 ? (
            <div className="glass p-8 text-center rounded-xl border border-dashed border-muted-foreground/30">
              <h3 className="text-lg font-medium text-foreground">No Members Found</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                You haven't added any members yet. Click the button above to add your first member profile.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <div key={member.id} className="glass p-5 rounded-2xl border-white/60 bg-white/40 flex flex-col hover:bg-white/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 ease-out">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 ring-4 ring-white">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground tracking-tight leading-none">{member.fullName}</p>
                      <p className="text-sm text-muted-foreground mt-1 capitalize">{member.gender || "Unknown"}</p>
                    </div>
                  </div>
                  <div className="text-sm space-y-1 text-muted-foreground/90 mt-auto pt-3 border-t border-slate-100">
                    <p className="flex justify-between"><span>Email:</span> <span className="text-foreground truncate ml-2">{member.email || "N/A"}</span></p>
                    <p className="flex justify-between"><span>Phone:</span> <span className="text-foreground">{member.phone || "N/A"}</span></p>
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
