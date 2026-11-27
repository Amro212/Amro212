import type { ComponentPropsWithoutRef } from 'react';

type Props = Pick<ComponentPropsWithoutRef<'a'>, 'aria-label' | 'className' | 'href'> & {
  children: string;
};

export default function ExternalActionLink({ children, className, ...props }: Props) {
  return (
    <a
      {...props}
      className={className ? `action-control ${className}` : 'action-control'}
      target="_blank"
      rel="noopener noreferrer"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 17 17 7" />
        <path d="M8.5 7H17v8.5" />
      </svg>
      <span className="action-label">{children}</span>
    </a>
  );
}
