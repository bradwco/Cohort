import type { ReactNode } from 'react';

type Props = {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
};

export function Section({ title, meta, children }: Props) {
  return (
    <div className="mb-9">
      <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
        <h2 className="m-0 font-serif text-xl font-normal italic tracking-[-0.02em]">
          {title}
        </h2>
        {meta && (
          <div className="font-mono text-[11px] tracking-wide text-ink-faint">{meta}</div>
        )}
      </div>
      {children}
    </div>
  );
}
