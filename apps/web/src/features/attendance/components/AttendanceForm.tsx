import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAttendanceSchema, CreateAttendanceRequest } from "@nehemiah/core/schemas";
import { ATTENDANCE_EVENT_TYPES } from "@nehemiah/core/constants";
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
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateInputValue, formatDateOnly, parseDateInputValue } from "../../../lib/date";
import { Textarea } from "../../../components/ui/textarea";
import { ConfirmAction } from "../../../components/app/ConfirmAction";

interface AttendanceFormProps {
  onDone?: () => void;
}

export const AttendanceForm: React.FC<AttendanceFormProps> = ({ onDone }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<CreateAttendanceRequest | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<CreateAttendanceRequest>({
    // @ts-ignore
    resolver: zodResolver(createAttendanceSchema),
    defaultValues: {
      eventType: undefined,
      eventDate: undefined,
      headcount: undefined,
      adultsCount: undefined,
      childrenCount: undefined,
      notes: "",
    },
  });

  const saveAttendance = async (data: CreateAttendanceRequest) => {
    setIsSubmitting(true);
    try {
      console.log("Submitting attendance data:", data);
      await new Promise(resolve => setTimeout(resolve, 800));
      // TODO: Connect to actual API endpoint
      // await apiClient("/attendance", { method: "POST", body: JSON.stringify(data) });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-trends"] });
      form.reset();
      setPendingSubmission(null);
      setConfirmOpen(false);
      onDone?.();
    } catch (error) {
      console.error("Failed to submit attendance:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewLabel = useMemo(() => {
    if (!pendingSubmission) return "";
    return `${pendingSubmission.eventType.replace("_", " ")} on ${formatDateOnly(pendingSubmission.eventDate)}`;
  }, [pendingSubmission]);

  return (
    <div className="surface-card p-6 sm:p-7">
      <div className="mb-6 border-b border-border/60 pb-5">
        <h2 className="text-xl font-bold tracking-tight">Log Attendance</h2>
        <p className="text-sm text-muted-foreground">Record the turnout for a service or ministry event.</p>
      </div>

      {/* @ts-ignore */}
      <Form {...form}>
        {/* @ts-ignore */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Type <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ATTENDANCE_EVENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type.replace("_", " ")}
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
              name="eventDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Date <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={formatDateInputValue(field.value)}
                      onChange={(e) => field.onChange(parseDateInputValue(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="headcount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Headcount <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="adultsCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adults Count</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="childrenCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Children Count</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Optional context such as special guests, combined services, or unusual turnout." {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <ConfirmAction
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title="Confirm attendance log"
              description={pendingSubmission ? `Save ${previewLabel}?` : "Review the entry before saving."}
              disabled={!pendingSubmission || isSubmitting}
              confirmLabel="Save"
              cancelLabel="Edit"
              onConfirm={() => {
                if (!pendingSubmission) return
                return saveAttendance(pendingSubmission)
              }}
              details={
                pendingSubmission ? (
                  <div className="space-y-2 rounded-2xl border border-border/70 bg-accent/45 p-3 text-sm">
                    <p className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold text-foreground">{pendingSubmission.headcount}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-muted-foreground">Adults</span>
                      <span className="text-foreground">{pendingSubmission.adultsCount ?? ".."}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-muted-foreground">Children</span>
                      <span className="text-foreground">{pendingSubmission.childrenCount ?? ".."}</span>
                    </p>
                  </div>
                ) : null
              }
              trigger={
                <Button
                  type="button"
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={isSubmitting}
                  onClick={async () => {
                    const isValid = await form.trigger();
                    if (!isValid) {
                      setConfirmOpen(false);
                      return;
                    }

                    setPendingSubmission(form.getValues() as CreateAttendanceRequest);
                    setConfirmOpen(true);
                  }}
                >
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Review attendance"}
                </Button>
              }
            />
          </div>
        </form>
      </Form>
    </div>
  );
};
