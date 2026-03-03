import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, Loader2, MoreHorizontal, Plus, Search, User, ChevronLeft, ChevronRight, StickyNote, Pencil } from "lucide-react";
import { MEMBER_PROFILE_EDITOR_ROLES } from "@nehemiah/core/constants";
import { type Member, type MemberNote } from "@nehemiah/core/schemas";
import { apiClient } from "../../../lib/api";
import { useAuthStore } from "../../../store/useAuthStore";
import { canEditMemberProfile, ensureRoleAccess } from "../../../lib/permissions";
import { PageHeader } from "../../../components/app/PageHeader";
import { ContactValue } from "../../../components/app/ContactValue";
import { CopyableDetailField } from "../../../components/app/CopyableDetailField";
import { MemberForm } from "../components/MemberForm";
import { MemberNoteForm } from "../components/MemberNoteForm";
import { getMemberAvatar } from "../lib/memberDisplay";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { Input } from "../../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";

const ITEMS_PER_PAGE = 10;

export const MembersPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberForEdit, setMemberForEdit] = useState<Member | null>(null);
  const [memberForNote, setMemberForNote] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const canEditProfiles = canEditMemberProfile(user);

  const { data: members, isLoading, error } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const response = await apiClient<{ data: Member[] }>("/members");
      return response.data;
    },
  });

  const { data: selectedMemberNotes, isLoading: isLoadingNotes } = useQuery({
    queryKey: ["member-notes", selectedMember?.id],
    enabled: Boolean(selectedMember?.id),
    queryFn: async () => {
      const response = await apiClient<{ data: MemberNote[] }>(`/notes/members/${selectedMember?.id}`);
      return response.data;
    },
  });

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!searchQuery.trim()) return members;

    const query = searchQuery.toLowerCase();
    return members.filter(
      (member) =>
        member.fullName.toLowerCase().includes(query) ||
        (member.email && member.email.toLowerCase().includes(query)) ||
        (member.phone && member.phone.includes(query))
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

  const openEditMember = (member: Member) => {
    const allowed = ensureRoleAccess({
      user,
      allowedRoles: MEMBER_PROFILE_EDITOR_ROLES,
    });

    if (!allowed) {
      return;
    }

    setMemberForEdit(member);
  };

  const detailsFooterActions = selectedMember ? (
    <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={() => setMemberForNote(selectedMember)}
      >
        <StickyNote className="h-4 w-4" />
        Add note
      </Button>
      <Button
        type="button"
        onClick={() => openEditMember(selectedMember)}
        variant={canEditProfiles ? "default" : "outline"}
        disabled={!canEditProfiles}
        title={!canEditProfiles ? "Only sysadmins and superadmins can edit member profiles" : undefined}
      >
        {canEditProfiles ? <Pencil className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        {canEditProfiles ? "Edit profile" : "Edit restricted"}
      </Button>
    </div>
  ) : null;

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
        <div className="surface-card flex min-h-[500px] flex-col p-6 sm:p-7">
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
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
                {searchQuery
                  ? "Try a broader search term or clear the filter."
                  : "Add your first member to start the directory."}
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
                                <span className="block max-w-[220px] truncate font-semibold text-foreground/90">
                                  {member.fullName}
                                </span>
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
                              <DropdownMenuContent align="end" className="w-[220px]">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setSelectedMember(member)}>
                                  View details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openEditMember(member)}
                                  disabled={!canEditProfiles}
                                  title={!canEditProfiles ? "Only sysadmins and superadmins can edit member profiles" : undefined}
                                >
                                  {canEditProfiles ? <Pencil className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                  Edit profile
                                  {!canEditProfiles ? (
                                    <DropdownMenuShortcut>Sys/Super</DropdownMenuShortcut>
                                  ) : null}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setMemberForNote(member)}>
                                  Add note
                                </DropdownMenuItem>
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
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="bg-white/50"
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
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

      <Dialog open={Boolean(memberForEdit)} onOpenChange={(open) => !open && setMemberForEdit(null)}>
        <DialogContent className="sm:max-w-3xl">
          {memberForEdit ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit member profile</DialogTitle>
                <DialogDescription>
                  Update {memberForEdit.fullName}&apos;s member record.
                </DialogDescription>
              </DialogHeader>
              <MemberForm
                member={memberForEdit}
                onDone={(savedMember) => {
                  setMemberForEdit(null);
                  setSelectedMember((currentMember) =>
                    currentMember?.id === savedMember.id ? savedMember : currentMember
                  );
                }}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(memberForNote)} onOpenChange={(open) => !open && setMemberForNote(null)}>
        <DialogContent className="sm:max-w-2xl">
          {memberForNote ? (
            <>
              <DialogHeader>
                <DialogTitle>Add note</DialogTitle>
                <DialogDescription>
                  Save a private note for {memberForNote.fullName}.
                </DialogDescription>
              </DialogHeader>
              <MemberNoteForm
                member={memberForNote}
                onDone={() => {
                  setMemberForNote(null);
                  setSelectedMember(memberForNote);
                }}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedMember)} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="sm:max-w-3xl">
          {selectedMember ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMember.fullName}</DialogTitle>
                <DialogDescription>Member details.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <CopyableDetailField
                    label="Phone"
                    value={selectedMember.phone}
                    emptyLabel="No phone number"
                    href={selectedMember.phone ? `tel:${selectedMember.phone}` : undefined}
                  />
                  <CopyableDetailField
                    label="Email"
                    value={selectedMember.email}
                    emptyLabel="No email address"
                    href={selectedMember.email ? `mailto:${selectedMember.email}` : undefined}
                  />
                  <CopyableDetailField
                    label="Address"
                    value={selectedMember.homeAddress}
                    emptyLabel="No address recorded"
                    multiline
                  />
                  <div className="surface-subtle p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Profile
                    </p>
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
                      <Badge variant="outline" className="normal-case tracking-[0.08em]">
                        {selectedMember.department || "Department not set"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="surface-subtle space-y-4 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Notes
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Private staff notes for this member.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setMemberForNote(selectedMember)}>
                      <StickyNote className="h-4 w-4" />
                      Add note
                    </Button>
                  </div>

                  {isLoadingNotes ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading notes...
                    </div>
                  ) : selectedMemberNotes && selectedMemberNotes.length > 0 ? (
                    <div className="space-y-3">
                      {selectedMemberNotes.map((note) => (
                        <div key={note.id} className="rounded-2xl border border-border/60 bg-background/80 p-4">
                          <p className="whitespace-pre-wrap text-sm text-foreground">{note.note}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {note.createdAt
                              ? new Date(note.createdAt).toLocaleString()
                              : "Saved note"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No notes yet.</p>
                  )}
                </div>
              </div>

              {detailsFooterActions}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};
