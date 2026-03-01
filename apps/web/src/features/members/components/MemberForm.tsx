import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMemberSchema, CreateMemberRequest } from "@nehemiah/core/schemas";
import { GENDERS, AGE_GROUPS, MARITAL_STATUSES } from "@nehemiah/core/constants";
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
import { Textarea } from "../../../components/ui/textarea";

interface MemberFormProps {
  onDone?: () => void;
}

export const MemberForm: React.FC<MemberFormProps> = ({ onDone }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateMemberRequest>({
    // @ts-ignore
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      homeAddress: "",
      gender: undefined,
      ageGroup: undefined,
      maritalStatus: undefined,
      department: "",
      occupation: "",
    },
  });

  const onSubmit = async (data: CreateMemberRequest) => {
    setIsSubmitting(true);
    try {
      console.log("Submitting member data:", data);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // TODO: API Integration
      form.reset();
      onDone?.();
    } catch (error) {
      console.error("Failed to submit member profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="surface-card p-6 sm:p-7">
      <div className="mb-6 border-b border-border/60 pb-5">
        <h2 className="text-xl font-bold tracking-tight">Add member</h2>
        <p className="mt-1 text-sm text-muted-foreground">Capture the core details you need for the church directory.</p>
      </div>

      {/* @ts-ignore */}
      <Form {...form}>
        {/* @ts-ignore */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <Input type="email" placeholder="jane@example.com" {...field} value={field.value || ""} />
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
                    <Input type="tel" placeholder="(555) 123-4567" {...field} value={field.value || ""} />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GENDERS.map((g) => (
                        <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MARITAL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AGE_GROUPS.map((a) => (
                        <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Textarea placeholder="Street address, area, and any location note that will help the church office." {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save member"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
