import * as React from 'react';
import { cn } from '@/lib/utils';
import { EyeIcon, EyeOffIcon } from 'lucide-react';

export type InputProps = React.ComponentProps<'input'> & {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftText?: string;
  rightText?: string;
  inputDir?: 'ltr' | 'rtl';
  /** Force LTR layout for URL/path fields (page builder links). */
  linkInput?: boolean;

  // Border flags
  showLeftBorder?: boolean;
  showRightBorder?: boolean;

  // Custom classes for styling text
  leftTextClassName?: string;
  rightTextClassName?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      leftIcon,
      rightIcon,
      leftText,
      rightText,
      inputDir,
      linkInput,
      value,

      // Default behavior
      showLeftBorder = true,
      showRightBorder = true,

      // Allow custom styling
      leftTextClassName,
      rightTextClassName,

      ...props
    },
    ref,
  ) => {
    const [inputType, setInputType] = React.useState(type);

    const togglePasswordVisibility = () => {
      setInputType((prev) => (prev === 'password' ? 'text' : 'password'));
    };

    const showDefaultEye = type === 'password' && !rightIcon;
    const resolvedDir = linkInput ? 'ltr' : inputDir;

    return (
      <div className="relative flex items-center w-full">
        {/* Left Text */}
        {leftText && (
          <span
            className={cn(
              'absolute left-[14px] pointer-events-none z-10 flex items-center',
              'text-[14px] text-muted-foreground',
              showLeftBorder ? 'border-r border-border pr-2' : '',
              leftTextClassName,
            )}
          >
            {leftText}
          </span>
        )}

        {/* Left Icon */}
        {leftIcon && (
          <span className="absolute left-[14px] pointer-events-none text-muted-foreground z-10">
            {leftIcon}
          </span>
        )}

        {/* Input */}
        <input
          type={inputType}
          data-slot="input"
          dir={resolvedDir}
          ref={ref}
          value={
            value !== undefined &&
            value !== null &&
            !(typeof value === 'number' && Number.isNaN(value))
              ? value
              : ''
          }
          className={cn(
            'file:text-foreground text-foreground placeholder:text-muted-foreground placeholder:text-sm selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-12 w-full min-w-0 rounded-lg border bg-transparent px-3 py-1 text-sm transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',

            // Focus styles
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',

            // Invalid styles
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',

            (linkInput || resolvedDir === 'ltr') && 'text-left',

            className,

            // Keep prefix/suffix room after className so `px-*` cannot overlap them.
            leftIcon || leftText ? 'pl-[58px]' : '',
            rightIcon || showDefaultEye || rightText ? 'pr-12' : '',
          )}
          {...props}
        />

        {/* Right Text / Eye Icon */}
        {(showDefaultEye || rightIcon || rightText) && (
          <span
            className={cn(
              'absolute right-[14px] pointer-events-none z-10 flex items-center',
              'text-[14px] text-muted-foreground',
              showRightBorder ? 'border-l border-border pl-2' : '',
              rightTextClassName,
            )}
          >
            {rightText ? (
              rightText
            ) : rightIcon ? (
              rightIcon
            ) : inputType === 'password' ? (
              <EyeOffIcon size="18px" />
            ) : (
              <EyeIcon size="18px" />
            )}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
