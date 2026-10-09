// Stillwell components: the public props of @workspace/stillwell-design-system/components/ui/*.
// Documentation only. Previews in this system are static renditions of the rendered app styles.
import * as React from "react";

/** Pill button. One `default` (primary) per screen. */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  /** Render the child element (e.g. a link) with button styling. */
  asChild?: boolean;
}

/** Panel surface; compose with CardHeader, CardTitle, CardDescription, CardContent, CardFooter. */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

/** Single-line field. Always pair with a visible label. */
export interface InputProps extends React.ComponentProps<"input"> {}

/** Multi-line reflection field. The app caps notes at 2,000 characters. */
export interface TextareaProps extends React.ComponentProps<"textarea"> {}

/** Radix checkbox. Consent must start unchecked. */
export interface CheckboxProps {
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
  disabled?: boolean;
  id?: string;
  name?: string;
}
