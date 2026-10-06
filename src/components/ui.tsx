import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { useI18n } from '../i18n';
import type { ScreeningStatus } from '../config/strips';
import type { OpkCategory } from '../cv/opkAnalysis';

type Variant = 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-bg hover:bg-ink/90 border border-transparent',
  secondary: 'bg-panel text-ink border border-[color:var(--border-strong)] hover:bg-panel-alt',
  ghost: 'bg-transparent text-ink border border-transparent hover:bg-ink/5',
  quiet: 'bg-panel-alt text-ink border border-transparent hover:bg-panel-alt/70',
  danger: 'bg-danger text-white border border-transparent hover:bg-danger/90',
};
const SIZES: Record<Size, string> = {
  sm: 'min-h-[36px] px-3.5 text-label gap-1.5 rounded-lg',
  md: 'min-h-[44px] px-5 text-body gap-2 rounded-xl',
  lg: 'min-h-[52px] px-6 text-body-lg gap-2.5 rounded-xl',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, className = '', children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} size={size === 'lg' ? 22 : 18} />}
      {children}
    </button>
  );
});

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
}

export function ButtonLink({ variant = 'primary', size = 'md', icon, className = '', children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} size={size === 'lg' ? 22 : 18} />}
      {children}
    </Link>
  );
}

export type BadgeStatus = ScreeningStatus | 'unreadable' | OpkCategory;

const STATUS_STYLE: Record<BadgeStatus, { icon: IconName; tone: string; bg: string }> = {
  normal: { icon: 'checkCircle', tone: 'text-success', bg: 'bg-success/10 border-success/40' },
  borderline: { icon: 'triangle', tone: 'text-gold', bg: 'bg-gold/10 border-gold/50' },
  flagged: { icon: 'octagon', tone: 'text-danger', bg: 'bg-danger/10 border-danger/45' },
  unreadable: { icon: 'question', tone: 'text-muted', bg: 'bg-ink/5 border-[color:var(--border-strong)]' },
  low: { icon: 'checkCircle', tone: 'text-muted', bg: 'bg-ink/5 border-[color:var(--border-strong)]' },
  rising: { icon: 'triangle', tone: 'text-gold', bg: 'bg-gold/10 border-gold/50' },
  peak: { icon: 'sparkle', tone: 'text-rose', bg: 'bg-rose/10 border-rose/45' },
};

export function statusIcon(status: BadgeStatus): IconName {
  return STATUS_STYLE[status].icon;
}
export function statusTone(status: BadgeStatus): string {
  return STATUS_STYLE[status].tone;
}

/** Status is always conveyed by icon shape + text, never by colour alone. */
export function StatusBadge({ status, size = 'md' }: { status: BadgeStatus; size?: 'sm' | 'md' | 'lg' }) {
  const { t } = useI18n();
  const s = STATUS_STYLE[status];
  const sizing = size === 'lg' ? 'px-3.5 py-1.5 text-body gap-2' : size === 'sm' ? 'px-2 py-0.5 text-caption gap-1' : 'px-2.5 py-1 text-label gap-1.5';
  return (
    <span className={`inline-flex items-center rounded-full border font-medium text-ink ${s.bg} ${sizing}`}>
      <Icon name={s.icon} size={size === 'lg' ? 20 : size === 'sm' ? 14 : 16} className={s.tone} />
      {t(`common.status.${status}`)}
    </span>
  );
}

/** Required on every result and recommendation screen. */
export function Disclaimer({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <aside
      role="note"
      aria-label={t('common.disclaimerTitle')}
      className={`flex gap-3 rounded-xl border border-[color:var(--border-strong)] bg-panel-alt/60 ${compact ? 'p-3 text-label' : 'p-4 text-label sm:text-body'}`}
    >
      <Icon name="info" size={20} className="mt-0.5 shrink-0 text-muted" />
      <p className="text-ink/90">{t('common.disclaimer')}</p>
    </aside>
  );
}

export function SectionHeading({ children, id, sub }: { children: ReactNode; id?: string; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 id={id} className="text-h3 sm:text-h2">
        {children}
      </h2>
      {sub && <p className="mt-1 text-muted">{sub}</p>}
    </div>
  );
}

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Accessible modal dialog using the native <dialog> element. */
export function Dialog({ open, title, onClose, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="w-[min(32rem,calc(100vw-2rem))] rounded-2xl border bg-panel p-0 text-ink backdrop:bg-[rgb(20_24_42/0.55)]"
    >
      {open && (
        <div className="p-6">
          <h2 id={titleId} className="text-h3">
            {title}
          </h2>
          <div className="mt-3 text-body text-ink/90">{children}</div>
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function Logo({ className = '', withWordmark = true }: { className?: string; withWordmark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="9" fill="none" stroke="rgb(var(--gold))" strokeWidth="2.4" />
        <path d="M16 2.5v6M16 23.5v6M2.5 16h6M23.5 16h6" stroke="rgb(var(--rose))" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="16" cy="16" r="3" fill="rgb(var(--ink))" />
      </svg>
      {withWordmark && <span className="font-display text-[1.375rem] font-semibold leading-none tracking-tight">Lumenova</span>}
    </span>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-caption text-danger" role="alert">
          <Icon name="octagon" size={14} /> {error}
        </p>
      ) : (
        hint && <p className="hint">{hint}</p>
      )}
    </div>
  );
}

export function NumberedList({ items, start = 1 }: { items: ReactNode[]; start?: number }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4">
          <span className="font-display text-h3 leading-none text-rose/90 tabular-nums" aria-hidden="true">
            {String(i + start).padStart(2, '0')}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

const TONES = { success: 'text-success', danger: 'text-danger', gold: 'text-gold', rose: 'text-rose', muted: 'text-muted' } as const;

export function CheckList({ items, tone = 'success', icon = 'check' }: { items: ReactNode[]; tone?: keyof typeof TONES; icon?: IconName }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <Icon name={icon} size={18} className={`mt-1 shrink-0 ${TONES[tone]}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
