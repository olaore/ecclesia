import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createChurchEventSchema, CreateChurchEventRequest } from "@nehemiah/core/schemas";
import { CHURCH_EVENT_TYPES, EVENT_VISIBILITY } from "@nehemiah/core/constants";
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
import {
  formatLocalDateTimeInputValue,
  parseLocalDateTimeInputValue,
} from "../../../lib/date";

export const EventForm: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<CreateChurchEventRequest>({
    // @ts-ignore
    resolver: zodResolver(createChurchEventSchema),
    defaultValues: {
      title: "",
      description: "",
      eventType: "special_service",
      startDate: new Date(),
      endDate: new Date(),
      visibility: "public",
    },
  });

  const onSubmit = async (data: CreateChurchEventRequest) => {
    setIsSubmitting(true);
    try {
      console.log("Submitting event data:", data);
      await new Promise(resolve => setTimeout(resolve, 800));
      // TODO: Connect to actual API endpoint
      // await apiClient("/events", { method: "POST", body: JSON.stringify(data) });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      form.reset();
    } catch (error) {
      console.error("Failed to submit event:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass p-6 rounded-xl border">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Schedule Event</h2>
        <p className="text-sm text-muted-foreground">Add a new program or meeting to the church calendar.</p>
      </div>

      {/* @ts-ignore */}
      <Form {...form}>
        {/* @ts-ignore */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Title <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="E.g., Annual Workers Retreat" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Brief details about the event..." {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Type <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CHURCH_EVENT_TYPES.map((type) => (
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
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EVENT_VISIBILITY.map((v) => (
                        <SelectItem key={v} value={v} className="capitalize">
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date & Time <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      value={formatLocalDateTimeInputValue(field.value)}
                      onChange={(e) => field.onChange(parseLocalDateTimeInputValue(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date & Time <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      value={formatLocalDateTimeInputValue(field.value)}
                      onChange={(e) => field.onChange(parseLocalDateTimeInputValue(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling...</> : "Schedule Event"}
          </Button>
        </form>
      </Form>
    </div>
  );
};
