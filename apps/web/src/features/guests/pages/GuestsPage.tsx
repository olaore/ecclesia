import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { GuestForm } from "../components/GuestForm";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { QrCode, ClipboardList, Loader2, UserPlus, Search, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "../../../lib/api";
import { Guest } from "@nehemiah/core/schemas";
import { formatDateOnly } from "../../../lib/date";
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

export const GuestsPage: React.FC = () => {
  const [view, setView] = useState<"list" | "form">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: guests, isLoading, error } = useQuery({
    queryKey: ["guests"],
    queryFn: async () => {
      const response = await apiClient<{ data: Guest[] }>("/guests");
      return response.data;
    },
  });

  const filteredGuests = useMemo(() => {
    if (!guests) return [];

    // Sort latest first
    let result = [...guests].sort((a, b) =>
      (b.visitDate ? new Date(b.visitDate).getTime() : 0) -
      (a.visitDate ? new Date(a.visitDate).getTime() : 0)
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.fullName.toLowerCase().includes(query) ||
          (g.email && g.email.toLowerCase().includes(query)) ||
          (g.phone && g.phone.includes(query))
      );
    }

    return result;
  }, [guests, searchQuery]);

  const totalPages = Math.ceil(filteredGuests.length / ITEMS_PER_PAGE);
  const paginatedGuests = filteredGuests.slice(
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
          <div className="glass p-6 rounded-2xl border border-white/60 min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search guests by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/50 border-white/40 focus-visible:ring-secondary/30"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex-1 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex-1 flex justify-center items-center text-destructive">
                Failed to load guests.
              </div>
            ) : filteredGuests.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center">
                <div className="bg-secondary/10 p-4 rounded-full mb-4">
                  <UserPlus className="h-8 w-8 text-secondary opacity-50" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Guest Tracker Empty</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                  {searchQuery ? "No guests match your search." : "Switch to the quick form to log new visitors, or have them scan a QR code holding the public link."}
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="rounded-xl border border-white/40 overflow-hidden bg-white/40">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[280px]">Guest Name</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Date Visited</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedGuests.map((guest) => (
                        <TableRow key={guest.id} className="hover:bg-white/60 transition-colors">
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-3">
                              <div className="h-9 w-9 bg-secondary/10 text-secondary rounded-full flex items-center justify-center shrink-0 ring-2 ring-white">
                                <UserPlus className="h-4 w-4" />
                              </div>
                              <span className="truncate max-w-[180px] font-semibold text-foreground/90">{guest.fullName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span className="text-foreground/80">{guest.email || "-"}</span>
                              <span className="text-muted-foreground">{guest.phone || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground font-medium">
                              {formatDateOnly(guest.visitDate)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-semibold text-muted-foreground bg-slate-100/80 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block border border-slate-200/50 shadow-sm">
                              {guest.status.replace("_", " ")}
                            </span>
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
                                <DropdownMenuItem>Add note</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-primary font-medium">Promote to member</DropdownMenuItem>
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
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredGuests.length)} of {filteredGuests.length} guests
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
