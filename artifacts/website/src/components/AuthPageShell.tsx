import type { ReactNode } from "react";
import { Link } from "wouter";
import { Brand } from "@/components/PublicSite";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  crossLinkLabel: string;
  crossLinkHref: string;
  children: ReactNode;
};

export default function AuthPageShell({
  eyebrow,
  title,
  description,
  crossLinkLabel,
  crossLinkHref,
  children,
}: AuthPageShellProps) {
  return (
    <main className="stillwell min-h-[100dvh] px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <Brand />
        <div className="mt-10 w-full text-center">
          <p className="eyebrow justify-center">{eyebrow}</p>
          <h1 className="display mt-3 text-3xl font-medium leading-tight text-foreground">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="mt-7 w-full min-w-0">{children}</div>
        <p className="mt-5 text-center text-sm">
          <Link href={crossLinkHref} className="font-semibold text-primary underline-offset-4 hover:underline">
            {crossLinkLabel}
          </Link>
        </p>
      </div>
    </main>
  );
}
