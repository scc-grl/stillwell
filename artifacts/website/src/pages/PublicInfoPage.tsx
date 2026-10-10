import { Link } from "wouter";

export type PublicInfoContent = {
  eyebrow: string;
  title: string;
  description: string;
  placeholder: string;
  partner?: boolean;
};

export default function PublicInfoPage({ content }: { content: PublicInfoContent }) {
  return <main id="main" className="min-h-[55vh]">
    <section className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
      <div className="max-w-3xl">
        <p className="eyebrow">{content.eyebrow}</p>
        <h1 className="display mt-4 text-[clamp(2.7rem,7vw,5rem)] leading-[1.02] tracking-[-.05em] text-primary">{content.title}</h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">{content.description}</p>
        <div className="mt-9 rounded-[24px] border border-border bg-secondary p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-secondary-foreground">Placeholder information</p>
          <p data-testid="text-public-placeholder" className="mt-3 text-sm leading-7 text-secondary-foreground">{content.placeholder}</p>
          {content.partner && <p className="mt-4 text-sm leading-7 text-secondary-foreground">Organizations interested in learning more are invited to <Link data-testid="link-partner-contact" href="/contact" className="font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:text-primary/80">get in touch</Link>.</p>}
        </div>
      </div>
    </section>
  </main>;
}
