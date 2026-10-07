"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A password field you can look at.
 *
 * Typing a password you cannot see, on a phone keyboard, is how people end
 * up locked out of an account they just created. The toggle is a button
 * rather than a checkbox so it cannot be submitted with the form, and it
 * stays reachable by keyboard — someone who cannot use a mouse has more
 * need of it, not less.
 *
 * It never reports its state anywhere. Whether the characters are shown is
 * a detail of this one render and is deliberately forgotten on reload: a
 * remembered "show my password" setting is a password left on screen.
 */
export function PasswordInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={shown ? "text" : "password"}
        // Room on the right so a long password never runs under the button.
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        title={shown ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3 text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {shown ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
