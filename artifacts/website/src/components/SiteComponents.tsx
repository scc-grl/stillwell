import { forwardRef } from "react";
import { AlertCircle, Check, Sprout } from "lucide-react";
import { Button, type ButtonProps } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { cn } from "@workspace/stillwell-design-system/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ratingChoices } from "@workspace/recovery-journal";

type SiteButtonProps = ButtonProps & { tone?: "primary" | "secondary" };

export const SiteButton = forwardRef<HTMLButtonElement, SiteButtonProps>(
  ({ tone, variant, className, ...props }, ref) => <Button
    ref={ref}
    {...props}
    variant={variant ?? (tone === "secondary" ? "outline" : "default")}
    className={cn("site-button", (variant ?? tone ?? "default") === "default" || tone === "primary"
      ? "site-button-primary"
      : ["outline", "secondary"].includes(variant ?? tone ?? "") ? "site-button-secondary" : "", className)}
  />,
);
SiteButton.displayName = "SiteButton";

export function NoticeabilityScale({
  value,
  onValueChange,
  disabled = false,
  label = "How noticeable is this today?",
  testIdPrefix = "noticeability",
}: {
  value: number | null;
  onValueChange: (value: (typeof ratingChoices)[number]["value"] | null) => void;
  disabled?: boolean;
  label?: string;
  testIdPrefix?: string;
}) {
  return <ToggleGroup
    type="single"
    value={value === null ? "" : String(value)}
    onValueChange={(next) => onValueChange(ratingChoices.find(choice => String(choice.value) === next)?.value ?? null)}
    disabled={disabled}
    aria-label={label}
    className="noticeability-scale"
  >
    {ratingChoices.map(({ label: text, value: rating }) => <ToggleGroupItem
      key={rating}
      value={String(rating)}
      aria-label={text}
      data-testid={`${testIdPrefix}-${rating}`}
      className="noticeability-option"
    >
      <span>{text}</span>
      <Check aria-hidden="true" className="noticeability-check" size={16} />
    </ToggleGroupItem>)}
  </ToggleGroup>;
}

export function StageIndicator({ stage, confirmed = false }: { stage: number; confirmed?: boolean }) {
  const label = `Stage ${stage} of 6`;
  return <div className="stage-indicator">
    <div role="img" aria-label={label} className="stage-segments">
      {Array.from({ length: 6 }, (_, index) => <span
        key={index}
        className={`stage-segment${index < stage ? " stage-segment-filled" : ""}`}
      />)}
    </div>
    <span className="stage-label">{label}</span>
    <span className={`stage-status${confirmed ? " stage-status-confirmed" : ""}`}>
      {confirmed ? "Confirmed by your clinician" : "Pending clinician review"}
    </span>
  </div>;
}

export function BoundaryNotice() {
  return <Alert variant="notice" className="boundary-notice">
    <AlertCircle aria-hidden="true" />
    <div>
      <AlertTitle>A safety note.</AlertTitle>
      <AlertDescription>Stillwell is not for a new injury or emergency. If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now.</AlertDescription>
    </div>
  </Alert>;
}

export function PaperNote() {
  return (
    <div className="paper-note-wrap">
      <Card className="paper-note" aria-label="A handwritten journal note, shown as an example">
        <p className="paper-note-date">Example entry · Tuesday, week two</p>
        <p className="paper-note-script">“9 hours of sleep. headache dissipated, mild nauseau.”</p>
        <p className="paper-note-signoff">One day, in my own words.</p>
      </Card>
      <span className="paper-note-washi" aria-hidden="true" />
    </div>
  );
}

export function IllustrationTile() {
  return <figure className="illustration-tile" aria-label="Illustration of a small sprout, captioned week 2">
    <Card className="illustration-card">
      <AspectRatio ratio={1} className="illustration-art">
        <div className="illustration-artwork" role="img" aria-label="A pencil sketch of a growing sprout">
          <Sprout aria-hidden="true" className="illustration-sprout" strokeWidth={1.1} />
          <span className="illustration-sun" aria-hidden="true" />
          <span className="illustration-ground" aria-hidden="true" />
        </div>
      </AspectRatio>
      <figcaption>week 2</figcaption>
    </Card>
  </figure>;
}
