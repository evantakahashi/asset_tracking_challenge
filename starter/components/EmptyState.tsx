export interface EmptyStateProps {
  headline: string;
  body: React.ReactNode;
}

export function EmptyState({ headline, body }: EmptyStateProps): React.ReactElement {
  return (
    <div className="py-16 px-4 text-center max-w-md mx-auto">
      <p className="font-serif italic text-lg text-neutral-700 leading-snug">{headline}</p>
      <div className="text-sm text-neutral-600 mt-3">{body}</div>
    </div>
  );
}
