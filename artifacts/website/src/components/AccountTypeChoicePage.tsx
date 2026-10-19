import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { rememberAccountChoice } from "@/lib/account";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/stillwell-design-system/components/ui/card";
import { Brand } from "@/components/PublicSite";

export default function AccountTypeChoicePage() {
  return (
    <main className="stillwell min-h-[100dvh] px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center">
        <Brand />
        <section className="mt-12 w-full max-w-3xl text-center sm:mt-16" aria-labelledby="account-choice-title">
          <p className="eyebrow justify-center">A private recovery journal</p>
          <h1 id="account-choice-title" className="display mt-4 text-3xl font-medium leading-tight text-foreground sm:text-4xl">
            Choose the account that fits you
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Stillwell is a personal, user-led space for concussion and post-concussive recovery.
          </p>
          <div className="mt-9 grid gap-5 text-left sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="display text-2xl font-medium">I’m here for my recovery</CardTitle>
                <CardDescription className="leading-6">
                  Create a private journal to reflect on your recovery in your own way.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  You choose what to record and what to revisit. Your journal is yours to manage.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/sign-up/patient" aria-label="Create a patient account" onClick={() => rememberAccountChoice("patient")}>
                    Continue as a patient <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="display text-2xl font-medium">I’m a clinician</CardTitle>
                <CardDescription className="leading-6">
                  Create a separate clinician account and save a private professional profile.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  Clinician accounts are self-identified and are not yet verified.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/clinicians/join" aria-label="Create a clinician account">
                    Continue as a clinician <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
          <p className="mt-7 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-primary underline-offset-4 hover:underline">Sign in</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
