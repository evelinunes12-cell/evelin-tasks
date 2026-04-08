import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import { USERNAME_REGEX, normalizeUsernameInput } from "@/lib/username";

interface UsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  currentUsername?: string | null;
  disabled?: boolean;
  label?: string;
  onAvailabilityChange?: (isAvailable: boolean | null) => void;
}

export function UsernameInput({
  value,
  onChange,
  currentUsername,
  disabled,
  label = "Username",
  onAvailabilityChange,
}: UsernameInputProps) {
  const normalizedValue = useMemo(() => normalizeUsernameInput(value), [value]);
  const debouncedUsername = useDebounce(normalizedValue, 400);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const lengthValid = normalizedValue.length >= 3 && normalizedValue.length <= 20;
  const patternValid = USERNAME_REGEX.test(normalizedValue);

  useEffect(() => {
    if (!debouncedUsername || !lengthValid || !patternValid) {
      setIsAvailable(null);
      onAvailabilityChange?.(null);
      return;
    }

    if (debouncedUsername === (currentUsername || "")) {
      setIsAvailable(true);
      onAvailabilityChange?.(true);
      return;
    }

    let cancelled = false;

    const checkAvailability = async () => {
      setChecking(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", debouncedUsername)
        .maybeSingle();

      if (!cancelled) {
        const available = !error && !data;
        setIsAvailable(available);
        onAvailabilityChange?.(available);
        setChecking(false);
      }
    };

    checkAvailability();

    return () => {
      cancelled = true;
    };
  }, [debouncedUsername, currentUsername, lengthValid, patternValid, onAvailabilityChange]);

  const checks = [
    {
      id: "length",
      label: "Mínimo 3 e máximo 20 caracteres",
      valid: lengthValid,
    },
    {
      id: "pattern",
      label: "Apenas letras minúsculas, números e _",
      valid: patternValid,
    },
    {
      id: "availability",
      label: checking ? "Verificando disponibilidade..." : "Disponibilidade",
      valid: isAvailable === true,
      pending: checking,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="username">{label}</Label>
        <Input
          id="username"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(normalizeUsernameInput(e.target.value))}
          placeholder="ex: maria_silva"
          autoComplete="off"
        />
      </div>

      <div className="space-y-1.5">
        {checks.map((check) => {
          const Icon = check.valid ? CheckCircle2 : XCircle;
          return (
            <div
              key={check.id}
              className={cn(
                "flex items-center gap-2 text-sm",
                check.valid ? "text-emerald-600" : "text-destructive",
                check.pending && "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{check.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

