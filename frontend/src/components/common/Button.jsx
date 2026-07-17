import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import Spinner from './Spinner';

/**
 * Reusable UI button component supporting multiple design variants, sizing, active loaders, and tap animations.
 */
export const Button = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  children,
  className,
  type = 'button',
  icon: Icon,
  onClick,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary',
    secondary: 'bg-primary-light text-primary hover:bg-blue-200 focus:ring-primary',
    ghost: 'bg-transparent text-text-secondary hover:bg-background hover:text-text-primary focus:ring-border',
    danger: 'bg-error text-white hover:bg-red-700 focus:ring-error',
    outline: 'border border-border bg-white text-text-primary hover:bg-background focus:ring-primary',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <motion.button
      whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center space-x-2">
          <Spinner className="w-4 h-4 text-current" />
          <span>Loading...</span>
        </span>
      ) : (
        <span className="flex items-center space-x-2 justify-center">
          {Icon && <Icon className={clsx('w-4 h-4', children ? 'mr-1.5' : '')} />}
          <span>{children}</span>
        </span>
      )}
    </motion.button>
  );
};

export default Button;
