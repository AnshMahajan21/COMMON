import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/helpers/classname-helper';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B3322] cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-[#2B3322] text-[#FEFAE0] hover:bg-[#3B462F]',
        earth: 'bg-[#D4A373] text-[#FEFAE0] hover:bg-[#C39262]',
        secondary: 'bg-[#E9EDC9] text-[#2B3322] border border-[#D7DEB0] hover:bg-[#CCD5AE]',
        outline: 'bg-[#FEFAE0] text-[#2B3322] border border-[#D7DEB0] hover:bg-[#FAEDCD]',
        ghost: 'text-[#5A4D3F] hover:bg-[#E9EDC9]/70 hover:text-[#2B3322]',
        destructive: 'bg-[#8C3B2B] text-[#FEFAE0] hover:bg-[#732F22]',
      },
      size: {
        default: 'min-h-[44px] px-5 py-2.5',
        sm: 'min-h-[38px] px-4 py-2 text-xs',
        lg: 'min-h-[48px] px-7 py-3',
        icon: 'min-h-[44px] min-w-[44px] p-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
