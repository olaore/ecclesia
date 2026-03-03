import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createMemberSchema,
  type CreateMemberRequest,
  type Member,
} from "@nehemiah/core/schemas";
import { GENDERS, AGE_GROUPS, MARITAL_STATUSES } from "@nehemiah/core/constants";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiClient } from "../../../lib/api";
import { formatDateInputValue, parseDateInputValue } from "../../../lib/date";
import { Button } from "../../../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Textarea } from "../../../components/ui/textarea";

interface MemberFormProps {
  member?: Member | null;
  onDone?: (member: Member) => void;
}

const memberFormSchema = createMemberSchema.extend({
  dateJoined: z.date().optional().nullable(),
});

type MemberFormValues = z.infer<typeof memberFormSchema>;

const getDefaultValues = (member?: Member | null): MemberFormValues => ({
  fullName: member?.fullName ?? "",
  email: member?.email ?? "",
  phone: member?.phone ?? "",
  homeAddress: member?.homeAddress ?? "",
  gender: member?.gender ?? undefined,
  ageGroup: member?.ageGroup ?? undefined,
  maritalStatus: member?.maritalStatus ?? undefined,
  department: member?.department ?? "",
  occupation: member?.occupation ?? "",
  dateJoined: member?.dateJoined ? new Date(member.dateJoined) : null,
  dobMonth: member?.dobMonth ?? undefined,
  dobDay: member?.dobDay ?? undefined,
  anniversaryMonth: member?.anniversaryMonth ?? undefined,
  anniversaryDay: member?.anniversaryDay ?? undefined,
});

export const MemberForm: React.FC<MemberFormProps> = ({ member, onDone }) => {
  const queryClient = useQueryClient();
  const isEditing = Boolean(member?.id);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: getDefaultValues(member),
  });

  React.useEffect(() => {
    form.reset(getDefaultValues(member));
  }, [form, member]);

  const memberMutation = useMutation({
    mutationFn: async (values: MemberFormValues) => {
      const endpoint = isEditing && member?.id ? `/members/${member.id}` : "/members";
      const method = isEditing ? "PATCH" : "POST";
      const payload: CreateMemberRequest = {
        ...values,
        dateJoined: values.dateJoined ?? null,
      };

      return apiClient<{ data: Member }>(endpoint, {
        method,
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success(isEditing ? "Member profile updated" : "Member created");

      if (!isEditing) {
        form.reset(getDefaultValues(null));
      }

      onDone?.(response.data);
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="surface-card p-6 sm:p-7">
      <div className="mb-6 border-b border-border/60 pb-5">
        <h2 className="text-xl font-bold tracking-tight">
          {isEditing ? "Edit member profile" : "Add member"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isEditing
            ? "Update the member directory record with the same validated profile form."
            : "Capture the core details you need for the church directory."}
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => memberMutation.mutate(values))}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="jane@example.com"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+2348012345678"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateJoined"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Joined</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={formatDateInputValue(field.value)}
                      onChange={(event) =>
                        field.onChange(parseDateInputValue(event.target.value) ?? null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GENDERS.map((gender) => (
                        <SelectItem key={gender} value={gender} className="capitalize">
                          {gender}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maritalStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marital Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MARITAL_STATUSES.map((status) => (
                        <SelectItem key={status} value={status} className="capitalize">
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ageGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age Group</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AGE_GROUPS.map((ageGroup) => (
                        <SelectItem key={ageGroup} value={ageGroup} className="capitalize">
                          {ageGroup}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <Input placeholder="Choir, Media, Protocol..." {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Occupation</FormLabel>
                  <FormControl>
                    <Input placeholder="Teacher, entrepreneur, student..." {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="homeAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Home Address</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Street address, area, and any location note that will help the church office."
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto"
              disabled={memberMutation.isPending}
            >
              {memberMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Save changes"
              ) : (
                "Save member"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
