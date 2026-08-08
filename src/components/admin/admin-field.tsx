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
};

export function AdminField({
  label,
  name,
  defaultValue,
  error,
  type = "text",
  textarea = false,
  rows = 3,
}: AdminFieldProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {textarea ? (
        <Textarea id={name} name={name} defaultValue={defaultValue} rows={rows} />
      ) : (
        <Input id={name} name={name} type={type} defaultValue={defaultValue} />
      )}
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
