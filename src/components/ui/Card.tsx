import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverable = false,
  bordered = true,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm',
        bordered && 'border border-neutral-200',
        hoverable && 'hover:shadow-md hover:border-neutral-300 transition-all duration-200 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className, ...props }) => {
  return (
    <div className={cn('px-5 py-4 border-b border-neutral-200', className)} {...props}>
      {children}
    </div>
  );
};

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className, ...props }) => {
  return (
    <h3 className={cn('text-lg font-semibold text-neutral-700', className)} {...props}>
      {children}
    </h3>
  );
};

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardBody: React.FC<CardBodyProps> = ({ children, className, ...props }) => {
  return (
    <div className={cn('px-5 py-4', className)} {...props}>
      {children}
    </div>
  );
};

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className, ...props }) => {
  return (
    <div className={cn('px-5 py-4 border-t border-neutral-200', className)} {...props}>
      {children}
    </div>
  );
};
