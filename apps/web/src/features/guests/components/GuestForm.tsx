import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGuestSchema, CreateGuestRequest } from "@nehemiah/core/schemas";
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
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "../../../lib/utils";

const guestIntentOptions = [
  { value: "visitor", label: "Just visiting" },
  { value: "maybe", label: "Maybe" },
  { value: "joined", label: "I want to join" },
] as const;

export const GuestForm: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [guestIntent, setGuestIntent] = useState<(typeof guestIntentOptions)[number]["value"]>("visitor");

  const form = useForm<CreateGuestRequest>({
    // @ts-ignore
    resolver: zodResolver(createGuestSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
    },
  });

  const onSubmit = async (data: CreateGuestRequest) => {
    setIsSubmitting(true);
    try {
      // TODO: Connect to actual TRPC/Fetch API mutation
      console.log("Submitting guest data:", data);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsSuccess(true);
      form.reset();
    } catch (error) {
      console.error("Failed to submit guest profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="surface-card animate-in fade-in zoom-in duration-300 flex flex-col items-center justify-center space-y-4 p-8 text-center">
        <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="text-2xl font-bold tracking-tight">Guest saved</h3>
        <p className="text-muted-foreground max-w-sm">
          {guestIntent === "joined"
            ? "The guest is marked as joined and ready for follow-up."
            : guestIntent === "maybe"
              ? "The guest is marked as undecided and ready for follow-up."
              : "The visitor details are now in the guest follow-up list and ready for the team to review."}
        </p>
        <Button
          className="mt-6"
          variant="outline"
          onClick={() => setIsSuccess(false)}
        >
          Add another guest
        </Button>
      </div>
    );
  }

  return (
    <div className="surface-card mx-auto w-full max-w-md p-6 md:p-8">
      <div className="mb-8 border-b border-border/60 pb-5">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Quick guest capture</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Keep this short so it works well before, during, or just after service.
        </p>
      </div>

      {/* @ts-ignore */}
      <Form {...form}>
        {/* @ts-ignore */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <FormLabel>Today&apos;s decision</FormLabel>
            <div className="grid gap-2 sm:grid-cols-3">
              {guestIntentOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGuestIntent(option.value)}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-sm font-medium transition-colors",
                    guestIntent === option.value
                      ? "border-secondary/30 bg-secondary/12 text-foreground"
                      : "border-border/70 bg-white/70 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" disabled={isSubmitting} {...field} />
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
                  <Input type="tel" placeholder="(555) 123-4567" disabled={isSubmitting} {...field} value={field.value || ""} />
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
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" disabled={isSubmitting} {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" className="w-full text-base font-semibold" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save guest"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};
