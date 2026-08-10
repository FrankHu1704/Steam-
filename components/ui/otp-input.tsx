"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function OtpInput({
  length = 4,
  value,
  onChange,
  error,
  disabled,
  autoFocus,
}: {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  function setDigit(index: number, digit: string) {
    const chars = value.split("");
    chars[index] = digit;
    onChange(chars.join("").slice(0, length));
  }

  function handleChange(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setDigit(index, "");
      return;
    }
    if (digits.length > 1) {
      // Pasted the whole code into one box.
      onChange(digits.slice(0, length));
      inputsRef.current[Math.min(digits.length, length) - 1]?.focus();
      return;
    }
    setDigit(index, digits);
    if (index < length - 1) inputsRef.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  return (
    <div className={cn("flex justify-center gap-3", error && "animate-otp-shake")}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Dígito ${i + 1}`}
          className={cn(
            "h-14 w-12 rounded-xl border-2 bg-background text-center text-xl font-bold outline-none transition-all duration-150",
            "focus:scale-105 focus:border-primary focus:ring-2 focus:ring-primary/20",
            error ? "border-destructive text-destructive" : value[i] ? "border-primary" : "border-border",
          )}
        />
      ))}
    </div>
  );
}
