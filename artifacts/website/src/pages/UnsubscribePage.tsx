import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Link } from "wouter";
import { useUnsubscribeNewsletter } from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const unsubscribeSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254, "Email address is too long."),
});

type UnsubscribeValues = z.infer<typeof unsubscribeSchema>;

export default function UnsubscribePage() {
  const unsubscribe = useUnsubscribeNewsletter();
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const form = useForm<UnsubscribeValues>({
    resolver: zodResolver(unsubscribeSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (values: UnsubscribeValues) => {
    setFeedback(null);
    unsubscribe.mutate({ data: { email: values.email.trim() } }, {
      onSuccess: () => {
        form.reset({ email: "" });
        setFeedback({ kind: "success", message: "If that address was subscribed, it has now been removed." });
      },
      onError: () => setFeedback({ kind: "error", message: "We couldn’t update the list just now. Please try again." }),
    });
  };

  return <main id="main" className="min-h-[55vh]">
    <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
      <p className="eyebrow">Stillwell updates</p>
      <h1 className="display mt-4 text-[clamp(2.7rem,7vw,4.5rem)] leading-[1.02] tracking-[-.05em] text-primary">Manage email updates</h1>
      <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">Enter the address you want removed from the Stillwell community update list. This does not affect your recovery journal or account. Stillwell is not sending newsletter messages yet.</p>
      <div className="mt-9 max-w-xl rounded-[24px] border border-border bg-secondary p-6 sm:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            <FormField control={form.control} name="email" render={({ field }) => <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <Input {...field} type="email" autoComplete="email" placeholder="Your email address" data-testid="input-unsubscribe-email" disabled={unsubscribe.isPending} className="border-border bg-background text-foreground placeholder:text-muted-foreground"/>
              </FormControl>
              <FormDescription className="sr-only">Enter the email address to remove from Stillwell updates.</FormDescription>
              <FormMessage data-testid="status-unsubscribe-validation"/>
            </FormItem>}/>
            <Button type="submit" size="sm" disabled={unsubscribe.isPending} data-testid="button-unsubscribe-submit" className="justify-self-start">
              {unsubscribe.isPending ? "Updating…" : "Remove my email"}
            </Button>
          </form>
        </Form>
        {feedback && <p data-testid="status-unsubscribe-feedback" role={feedback.kind === "error" ? "alert" : "status"} aria-live={feedback.kind === "error" ? "assertive" : "polite"} className={`mt-4 rounded-xl px-4 py-3 text-sm ${feedback.kind === "success" ? "bg-background text-primary" : "bg-destructive text-destructive-foreground"}`}>{feedback.message}</p>}
      </div>
      <p className="mt-6 text-sm text-muted-foreground"><Link href="/" data-testid="link-unsubscribe-home" className="font-semibold text-primary underline underline-offset-4">Back to Stillwell</Link></p>
    </section>
  </main>;
}
