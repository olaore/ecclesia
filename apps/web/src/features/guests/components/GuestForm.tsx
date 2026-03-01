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

export const GuestForm: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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
      <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center glass rounded-2xl animate-in fade-in zoom-in duration-300">
        <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="text-2xl font-bold tracking-tight">Welcome to Nehemiah CMS!</h3>
        <p className="text-muted-foreground max-w-sm">
          Thank you for signing in. Your details have been securely saved.
          We hope you enjoy the rest of the service.
        </p>
        <Button
          className="mt-6"
          variant="outline"
          onClick={() => setIsSuccess(false)}
        >
          Submit another guest
        </Button>
      </div>
    );
  }

  return (
    <div className="glass p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/50 max-w-md w-full mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome Guest!</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Please fill out this quick form so we can get to know you better.
        </p>
      </div>

      {/* @ts-ignore */}
      <Form {...form}>
        {/* @ts-ignore */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

          <Button type="submit" className="w-full text-base py-6 font-semibold" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              "Submit Details"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};
