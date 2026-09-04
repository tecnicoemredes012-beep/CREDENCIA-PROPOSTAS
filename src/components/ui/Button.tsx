import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'cx-button-primary font-bold cursor-pointer',
  secondary: 'cx-button-secondary font-semibold cursor-pointer',
  ghost: 'border border-transparent bg-transparent text-slate-600 hover:bg-emerald-50 hover:text-slate-950 font-semibold cursor-pointer',
  danger: 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold cursor-pointer'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs rounded-lg',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-12 px-5 text-sm rounded-2xl'
};

export function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap transition duration-150 disabled:opacity-50 disabled:pointer-events-none select-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {leftIcon}
      {children && <span>{children}</span>}
      {rightIcon}
    </button>
  );
}
