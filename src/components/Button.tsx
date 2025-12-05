import React from 'react';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {
    variant = 'secondary',
    size = 'md',
    icon,
    iconPosition = 'left',
    children,
    disabled = false,
    onClick,
    title,
    className = '',
    style,
    type = 'button',
  } = props;
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: icon && children ? '0.375rem' : '0',
    border: 'none',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    outline: 'none',
    ...style,
  };

  // Size styles
  const sizeStyles: Record<'sm' | 'md' | 'lg', React.CSSProperties> = {
    sm: {
      padding: '0.15rem 0.35rem',
      fontSize: '0.75rem',
      minHeight: '24px',
    },
    md: {
      padding: '0.3rem 0.6rem',
      fontSize: '0.875rem',
      minHeight: '28px',
    },
    lg: {
      padding: '0.4rem 0.8rem',
      fontSize: '1rem',
      minHeight: '32px',
    },
  };

  // Variant styles
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '#007bff',
      color: 'white',
    },
    secondary: {
      backgroundColor: '#6c757d',
      color: 'white',
    },
    danger: {
      backgroundColor: '#dc3545',
      color: 'white',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'inherit',
      border: '1px solid currentColor',
    },
    icon: {
      padding: '0.15rem',
      minWidth: 'auto',
      backgroundColor: 'transparent',
      color: 'inherit',
    },
  };

  const hoverStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '#0056b3',
      boxShadow: '0 2px 4px rgba(0, 123, 255, 0.3)',
    },
    secondary: {
      backgroundColor: '#5a6268',
      boxShadow: '0 2px 4px rgba(108, 117, 125, 0.3)',
    },
    danger: {
      backgroundColor: '#c82333',
      boxShadow: '0 2px 4px rgba(220, 53, 69, 0.3)',
    },
    ghost: {
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    icon: {
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
      transform: 'scale(1.05)',
    },
  };

  const disabledStyles: React.CSSProperties = {
    opacity: 0.6,
    cursor: 'not-allowed',
  };

  const [isHovered, setIsHovered] = React.useState(false);

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...(disabled ? disabledStyles : {}),
    ...(isHovered && !disabled ? hoverStyles[variant] : {}),
  };

  const handleMouseEnter = () => {
    if (!disabled) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    if (!disabled) {
      e.currentTarget.style.outline = '2px solid #007bff';
      e.currentTarget.style.outlineOffset = '2px';
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLButtonElement>) => {
    e.currentTarget.style.outline = 'none';
  };

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={className}
      style={combinedStyles}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;

