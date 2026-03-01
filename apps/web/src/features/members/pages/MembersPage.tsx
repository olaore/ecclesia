import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MemberForm } from "../components/MemberForm";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Plus, User, Loader2, Search, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "../../../lib/api";
import { Member } from "@nehemiah/core/schemas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";

const ITEMS_PER_PAGE = 10;

export const MembersPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: members, isLoading, error } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const response = await apiClient<{ data: Member[] }>("/members");
      return response.data;
    },
  });

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!searchQuery.trim()) return members;

    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(query) ||
        (m.email && m.email.toLowerCase().includes(query)) ||
        (m.phone && m.phone.includes(query))
    );
  }, [members, searchQuery]);

  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when search query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Members Directory</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the congregation, update profiles, and view member timelines.
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
          <div className="glass p-6 rounded-2xl border border-white/60 min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/50 border-white/40 focus-visible:ring-primary/30"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex-1 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex-1 flex justify-center items-center text-destructive">
                Failed to load members.
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                  <User className="h-8 w-8 text-primary opacity-50" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No Members Found</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                  {searchQuery ? "No members match your search." : "You haven't added any members yet."}
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="rounded-xl border border-white/40 overflow-hidden bg-white/40">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[300px]">Member</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Demographics</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMembers.map((member) => (
                        <TableRow key={member.id} className="hover:bg-white/60 transition-colors">
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-3">
                              <div className="h-9 w-9 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 ring-2 ring-white">
                                <User className="h-4 w-4" />
                              </div>
                              <span className="truncate max-w-[200px] font-semibold text-foreground/90">{member.fullName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span className="text-foreground/80">{member.email || "-"}</span>
                              <span className="text-muted-foreground">{member.phone || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm capitalize">
                              <span className="text-foreground/80">{member.gender || "-"}</span>
                              <span className="text-muted-foreground">{member.maritalStatus ? member.maritalStatus.replace('_', ' ') : "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[160px]">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>View details</DropdownMenuItem>
                                <DropdownMenuItem>Edit profile</DropdownMenuItem>
                                <DropdownMenuItem>Add note</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 px-2">
                    <p className="text-sm text-muted-foreground font-medium">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredMembers.length)} of {filteredMembers.length} members
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="bg-white/50"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="bg-white/50"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

