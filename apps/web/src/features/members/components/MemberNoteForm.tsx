import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { createNoteSchema, type CreateNoteRequest, type Member } from "@nehemiah/core/schemas";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ApiError, apiClient } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import { Textarea } from "../../../components/ui/textarea";
import { Loader2 } from "lucide-react";

interface MemberNoteFormProps {
  member: Member;
  onDone?: () => void;
}

export const MemberNoteForm: React.FC<MemberNoteFormProps> = ({ member, onDone }) => {
  const queryClient = useQueryClient();
  const form = useForm<CreateNoteRequest>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: {
      memberId: member.id,
      note: "",
    },
  });

  React.useEffect(() => {
    form.reset({
      memberId: member.id,
      note: "",
    });
  }, [form, member.id]);

  const createNoteMutation = useMutation({
    mutationFn: async (values: CreateNoteRequest) =>
      apiClient<{ data: unknown }>("/notes", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["member-notes", member.id] });
      toast.success("Note added");
      form.reset({
        memberId: member.id,
        note: "",
      });
      onDone?.();
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="surface-card p-6 sm:p-7">
      <div className="mb-6 border-b border-border/60 pb-5">
        <h2 className="text-xl font-bold tracking-tight">Add note</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Save a private staff note for {member.fullName}.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => createNoteMutation.mutate(values))}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Record pastoral context, follow-up reminders, or anything the office should remember."
                    className="min-h-32"
                    {...field}
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
              disabled={createNoteMutation.isPending}
            >
              {createNoteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save note"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
