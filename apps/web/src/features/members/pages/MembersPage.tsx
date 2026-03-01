import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MemberForm } from "../components/MemberForm";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Plus,
  User,
  Loader2,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "../../../lib/api";
import { Member } from "@nehemiah/core/schemas";
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
import { getMemberAvatar } from "../lib/memberDisplay";
import { ContactValue } from "../../../components/app/ContactValue";

const ITEMS_PER_PAGE = 10;

export const MembersPage: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
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

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Members"
        description="Member directory."
        actions={
          <Button size="lg" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add member
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="surface-card min-h-[500px] p-6 sm:p-7 flex flex-col">
          <div className="mb-6 flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">Directory</h3>
                <Badge variant="outline">{filteredMembers.length} records</Badge>
                {searchQuery ? <Badge variant="secondary">Filtered</Badge> : null}
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Search members by name, email, or phone number.
              </p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-1 items-center justify-center text-destructive">
              Failed to load members.
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <User className="h-7 w-7 text-primary opacity-70" />
              </div>
              <h3 className="text-lg font-medium text-foreground">No members found</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {searchQuery ? "Try a broader search term or clear the filter." : "Add your first member to start the directory."}
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col">
              <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-white/70">
                <Table>
                  <TableHeader className="bg-accent/45">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[320px]">Member</TableHead>
                    <TableHead>Contact</TableHead>
                      <TableHead>Profile</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMembers.map((member) => {
                      const avatar = getMemberAvatar(member);

                      return (
                        <TableRow key={member.id ?? member.fullName}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg ring-4 ring-white/70">
                                <span aria-hidden="true">{avatar}</span>
                              </div>
                              <div className="min-w-0">
                                <span className="block max-w-[220px] truncate font-semibold text-foreground/90">{member.fullName}</span>
                                <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  Member record
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <ContactValue phone={member.phone} email={member.email} />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="normal-case tracking-[0.08em]">
                                {member.gender || "Gender not set"}
                              </Badge>
                              <Badge variant="outline" className="normal-case tracking-[0.08em]">
                                {member.ageGroup || "Age group not set"}
                              </Badge>
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
                              <DropdownMenuContent align="end" className="w-[180px]">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setSelectedMember(member)}>
                                  View details
                                </DropdownMenuItem>
                                <DropdownMenuItem>Edit profile</DropdownMenuItem>
                                <DropdownMenuItem>Add note</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between px-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredMembers.length)} of {filteredMembers.length}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="bg-white/50"
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
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
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>Member details.</DialogDescription>
          </DialogHeader>
          <MemberForm onDone={() => setIsCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedMember)} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selectedMember ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMember.fullName}</DialogTitle>
                <DialogDescription>Member details.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="surface-subtle p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Contact</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="text-foreground">{selectedMember.phone || "No phone number"}</p>
                    <p className="text-muted-foreground">{selectedMember.email || "No email address"}</p>
                  </div>
                </div>
                <div className="surface-subtle p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Profile</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="normal-case tracking-[0.08em]">
                      {selectedMember.gender || "Gender not set"}
                    </Badge>
                    <Badge variant="outline" className="normal-case tracking-[0.08em]">
                      {selectedMember.ageGroup || "Age group not set"}
                    </Badge>
                    <Badge variant="outline" className="normal-case tracking-[0.08em]">
                      {selectedMember.maritalStatus || "Marital status not set"}
                    </Badge>
                  </div>
                </div>
                <div className="surface-subtle p-4 sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Address</p>
                  <p className="mt-3 text-sm text-foreground">
                    {selectedMember.homeAddress || "No address recorded."}
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};
