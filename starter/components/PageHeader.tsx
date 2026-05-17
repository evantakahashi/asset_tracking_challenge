import clsx from "clsx";

export interface PageHeaderProps {
  crumb?: string;
  title: string | React.ReactNode;
  titleVariant?: "plain" | "editorial";
  subtitle?: string | React.ReactNode;
}

export function PageHeader({ crumb, title, titleVariant = "plain", subtitle }: PageHeaderProps): React.ReactElement {
  return (
    <header className="mb-6">
      {crumb ? (
        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500 mb-2">
          {crumb}
        </div>
      ) : null}
      <h1
        className={clsx(
          "leading-tight tracking-tight text-neutral-900",
          titleVariant === "editorial"
            ? "font-serif italic text-[28px] font-semibold"
            : "font-sans text-2xl font-semibold",
        )}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="text-sm text-neutral-600 mt-1">{subtitle}</p>
      ) : null}
    </header>
  );
}
