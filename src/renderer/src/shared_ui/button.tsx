import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none',
  {
    variants: {
      variant: {
        default:
          'border border-line-mid bg-transparent text-ink-dim hover:border-amber/40 hover:text-amber',
        ghost: 'bg-transparent text-ink-dim hover:bg-white/[0.03]',
        outline:
          'border border-line-mid bg-transparent text-ink-dim hover:bg-white/[0.03]',
        amber:
          'border border-amber/30 bg-amber/10 text-amber hover:bg-amber/15',
      },
      size: {
        sm: 'h-7 px-3 text-[11px]',
        md: 'h-9 px-4 text-xs',
        lg: 'h-11 px-6 text-sm',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
