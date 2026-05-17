import clsx from "clsx";

export type CodeMessages = Record<string, string | ((details?: any) => string)>;

export function ApiErrorBanner({
  code,
  message,
  details,
  codeMessages,
  className,
}: {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  codeMessages: CodeMessages;
  className?: string;
}): React.ReactElement {
  const mapped = codeMessages[code];
  const text =
    typeof mapped === "function"
      ? mapped(details)
      : typeof mapped === "string"
      ? mapped
      : message;
  return (
    <div className={clsx("bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-900", className)}>
      <div className="font-medium">{text}</div>
      {details ? (
        <pre className="mt-2 text-[11px] font-mono whitespace-pre-wrap text-red-800/80">
          {Object.entries(details).map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`).join("\n")}
        </pre>
      ) : null}
    </div>
  );
}
