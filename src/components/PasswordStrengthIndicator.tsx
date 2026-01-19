import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface StrengthCheck {
  label: string;
  passed: boolean;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const checks: StrengthCheck[] = useMemo(() => [
    { label: "At least 6 characters", passed: password.length >= 6 },
    { label: "Contains uppercase letter", passed: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", passed: /[a-z]/.test(password) },
    { label: "Contains a number", passed: /[0-9]/.test(password) },
    { label: "Contains special character", passed: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ], [password]);

  const passedCount = checks.filter(c => c.passed).length;
  
  const strengthLabel = useMemo(() => {
    if (passedCount <= 1) return { text: "Weak", color: "bg-destructive" };
    if (passedCount <= 2) return { text: "Fair", color: "bg-orange-500" };
    if (passedCount <= 3) return { text: "Good", color: "bg-yellow-500" };
    if (passedCount <= 4) return { text: "Strong", color: "bg-emerald-500" };
    return { text: "Very Strong", color: "bg-green-600" };
  }, [passedCount]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
          {[1, 2, 3, 4, 5].map((segment) => (
            <div
              key={segment}
              className={`flex-1 h-full rounded-full transition-all duration-300 ${
                segment <= passedCount ? strengthLabel.color : "bg-muted"
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium min-w-[70px] text-right ${
          passedCount <= 1 ? "text-destructive" : 
          passedCount <= 2 ? "text-orange-500" : 
          passedCount <= 3 ? "text-yellow-600" : 
          "text-emerald-600"
        }`}>
          {strengthLabel.text}
        </span>
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-1 gap-1">
        {checks.map((check, index) => (
          <div
            key={index}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              check.passed ? "text-emerald-600" : "text-muted-foreground"
            }`}
          >
            {check.passed ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            <span>{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
