import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { GuestForm } from "../components/GuestForm";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { QrCode, Loader2, UserPlus, Search, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "../../../lib/api";
import { Guest } from "@nehemiah/core/schemas";
import { formatDateOnly } from "../../../lib/date";
import { Badge } from "../../../components/ui/badge";
import { PageHeader } from "../../../components/app/PageHeader";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { ContactValue } from "../../../components/app/ContactValue";

const ITEMS_PER_PAGE = 10;

export const GuestsPage: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Guests"
        title="Guest follow-up"
        description="Guest register."
        actions={
          <Button size="lg" variant="secondary" onClick={() => setIsCreateOpen(true)}>
            <QrCode className="h-4 w-4" />
            Quick form
          </Button>
        }
      />

      <div className="space-y-4">
          <div className="surface-card min-h-[500px] p-6 sm:p-7 flex flex-col">
            <div className="mb-6 flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">Recent visitors</h3>
                  <Badge variant="outline">{filteredGuests.length} guests</Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Sorted by most recent visit so follow-up stays timely.
                </p>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search guests"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
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
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/12">
                  <UserPlus className="h-7 w-7 text-secondary opacity-70" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No guests found</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  {searchQuery ? "Try another name, email address, or phone number." : "Use Quick form when you need to record a visitor."}
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-white/70">
                  <Table>
                    <TableHeader className="bg-accent/45">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[280px]">Guest Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Date Visited</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedGuests.map((guest) => (
                        <TableRow key={guest.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/12 text-secondary ring-4 ring-white/70">
                                <UserPlus className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="block max-w-[180px] truncate font-semibold text-foreground/90">{guest.fullName}</span>
                                <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  Visitor record
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <ContactValue phone={guest.phone} email={guest.email} />
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground font-medium">
                              {formatDateOnly(guest.visitDate)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                              guest.status === "joined"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-border/80 bg-accent/60 text-muted-foreground"
                            }`}>
                              {guest.status === "joined" ? "Joined" : "Visitor"}
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
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredGuests.length)} of {filteredGuests.length}
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

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Quick form</DialogTitle>
            <DialogDescription>Guest entry.</DialogDescription>
          </DialogHeader>
          <GuestForm />
        </DialogContent>
      </Dialog>
    </div>
  );
};
