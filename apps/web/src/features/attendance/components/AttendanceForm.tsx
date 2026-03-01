import React, { useState } from "react";
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
import { formatDateInputValue, parseDateInputValue } from "../../../lib/date";

export const AttendanceForm: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<CreateAttendanceRequest>({
    // @ts-ignore
    resolver: zodResolver(createAttendanceSchema),
    defaultValues: {
      eventType: "sunday_service",
      eventDate: new Date(),
      headcount: 0,
      adultsCount: 0,
      childrenCount: 0,
      notes: "",
    },
  });

  const onSubmit = async (data: CreateAttendanceRequest) => {
    setIsSubmitting(true);
    try {
      console.log("Submitting attendance data:", data);
      await new Promise(resolve => setTimeout(resolve, 800));
      // TODO: Connect to actual API endpoint
      // await apiClient("/attendance", { method: "POST", body: JSON.stringify(data) });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-trends"] });
      form.reset();
    } catch (error) {
      console.error("Failed to submit attendance:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass p-6 rounded-xl border">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Log Attendance</h2>
        <p className="text-sm text-muted-foreground">Record headcount for recent services or events.</p>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value || "sunday_service"}>
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
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
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
                      value={field.value || ""}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || null)}
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
                      value={field.value || ""}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || null)}
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
                  <Input placeholder="E.g., Special guest minister present..." {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Attendance"}
          </Button>
        </form>
      </Form>
    </div>
  );
};
