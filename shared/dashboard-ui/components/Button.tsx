import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LeafTone } from "./types";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: LeafTone;
  pending?: boolean;
  pendingLabel?: string;
}

export const Button = ({
  tone = "neutral",
  pending = false,
  pendingLabel = "Working",
  className = "",
  children,
  disabled,
  type = "button",
  ...buttonProps
}: ButtonProps) => (
  <button
    {...buttonProps}
    type={type}
    className={`leaf-button ${className}`.trim()}
    data-tone={tone}
    disabled={disabled || pending}
    aria-busy={pending}
  >
    {pending ? <span className="leaf-spinner" aria-hidden="true" /> : null}
    {pending ? pendingLabel : children}
  </button>
);

interface IconButtonProps extends Omit<ButtonProps, "children"> {
  label: string;
  icon: ReactNode;
}

export const IconButton = ({ label, icon, className = "", ...props }: IconButtonProps) => (
  <Button
    {...props}
    className={`leaf-icon-button ${className}`.trim()}
    aria-label={label}
    title={label}
  >
    {icon}
  </Button>
);
