import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AdminFieldProps = {
  label: string;
  name: string;
  defaultValue: string;
  error?: string;
  type?: string;
  textarea?: boolean;
  rows?: number;
  id?: string;
};

export function AdminField({
  label,
  name,
  defaultValue,
  error,
  type = "text",
  textarea = false,
  rows = 3,
  id,
}: AdminFieldProps) {
  const fieldId = id ?? name;

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {textarea ? (
        <Textarea
          id={fieldId}
          name={name}
          defaultValue={defaultValue}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
        />
      ) : (
        <Input
          id={fieldId}
          name={name}
          type={type}
          defaultValue={defaultValue}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
        />
      )}
      {error && (
        <p id={`${fieldId}-error`} className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
