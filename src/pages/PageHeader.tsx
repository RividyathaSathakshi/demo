import type { ReactNode } from 'react';

export function PageHeader({ title, lead, children }: { title: string; lead?: string; children?: ReactNode }) {
  return (
    <header className="border-b bg-panel-alt/50">
      <div className="container-page py-12 sm:py-16">
        <h1 className="text-h1 sm:text-display">{title}</h1>
        {lead && <p className="mt-3 max-w-2xl text-body-lg text-muted">{lead}</p>}
        {children}
      </div>
    </header>
  );
}
