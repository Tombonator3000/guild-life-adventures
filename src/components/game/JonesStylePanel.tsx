// Jones-Style Panel Components
// Provides standardized layout matching Jones in the Fast Lane UI
// - Items with dotted lines connecting names to prices (like "Hamburgers........ $83")
// - Clean list format for locations, employers, etc.

import type React from 'react';

interface JonesMenuItemProps {
  label: string;
  price?: number;
  suffix?: string; // For things like "/hr" or "/week"
  disabled?: boolean;
  onClick?: () => void;
  highlight?: boolean;
  className?: string;
  darkText?: boolean; // Use dark brown text for light backgrounds
  largeText?: boolean; // Use larger text (text-base instead of text-sm)
}

// Single menu item with dotted line connecting to price
export function JonesMenuItem({
  label,
  price,
  suffix = '',
  disabled = false,
  onClick,
  highlight = false,
  className = '',
  darkText = false,
  largeText = false,
}: JonesMenuItemProps) {
  const textSize = largeText ? 'text-base' : 'text-sm';
  const textColor = highlight
    ? 'text-gold font-bold'
    : darkText
      ? 'text-[#3d2a14]'
      : 'text-[#e0d4b8]';
  const hoverBg = darkText ? 'hover:bg-[#d4c4a8]' : 'hover:bg-[#5c4a32]';
  const dotColor = darkText ? 'border-[#8b7355]' : 'border-[#8b7355]';

  const content = (
    <div
      className={`
        flex items-baseline w-full font-mono ${textSize}
        ${disabled ? 'opacity-50' : ''}
        ${textColor}
        ${className}
      `}
    >
      <span className="whitespace-nowrap">{label}</span>
      {price !== undefined && (
        <>
          <span className={`flex-1 border-b border-dotted ${dotColor} mx-1 mb-1`}></span>
          <span className={`whitespace-nowrap font-bold ${darkText ? 'text-[#8b6914]' : 'text-gold'}`}>
            ${price}{suffix}
          </span>
        </>
      )}
    </div>
  );

  if (onClick && !disabled) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full text-left py-1 px-2 ${hoverBg} transition-colors rounded`}
      >
        {content}
      </button>
    );
  }

  return <div className="py-1 px-2">{content}</div>;
}

interface JonesListItemProps {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  darkText?: boolean;
}

// Simple list item (for employers, education options, etc.)
export function JonesListItem({
  label,
  disabled = false,
  onClick,
  active = false,
  className = '',
  darkText = false,
}: JonesListItemProps) {
  const textColor = active
    ? 'text-gold font-bold'
    : darkText
      ? 'text-[#3d2a14]'
      : 'text-[#e0d4b8]';
  const hoverBg = darkText ? 'hover:bg-[#d4c4a8]' : 'hover:bg-[#5c4a32]';

  const content = (
    <div
      className={`
        font-mono text-sm
        ${disabled ? 'opacity-50' : ''}
        ${textColor}
        ${className}
      `}
    >
      {label}
    </div>
  );

  if (onClick && !disabled) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full text-left py-1 px-2 ${hoverBg} transition-colors rounded`}
      >
        {content}
      </button>
    );
  }

  return <div className="py-1 px-2">{content}</div>;
}

interface JonesPanelHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

// Panel header styled like Jones locations
export function JonesPanelHeader({ title, subtitle, className = '' }: JonesPanelHeaderProps) {
  return (
    <div className={`bg-[#2a5c3a] text-white px-3 py-2 font-bold text-center mb-2 ${className}`}>
      <div className="font-display text-lg tracking-wide uppercase">{title}</div>
      {subtitle && (
        <div className="text-xs text-[#a0d8b0] font-normal">{subtitle}</div>
      )}
    </div>
  );
}

interface JonesSectionHeaderProps {
  title: string;
  className?: string;
}

// Section header for sub-sections within a panel
export function JonesSectionHeader({ title, className = '' }: JonesSectionHeaderProps) {
  return (
    <div className={`bg-[#8b7355] text-white px-3 py-1 font-bold text-sm mb-1 ${className}`}>
      {title}
    </div>
  );
}

interface JonesPanelProps {
  children: React.ReactNode;
  className?: string;
}

// Main panel wrapper with Jones-style background
export function JonesPanel({ children, className = '' }: JonesPanelProps) {
  return (
    <div
      className={`
        bg-[#3d3224] border-2 border-[#8b7355] rounded
        overflow-hidden
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface JonesPanelContentProps {
  children: React.ReactNode;
  className?: string;
}

// Content area for Jones panel
export function JonesPanelContent({ children, className = '' }: JonesPanelContentProps) {
  return (
    <div className={`p-2 ${className}`}>
      {children}
    </div>
  );
}

interface JonesMenuSectionProps {
  items: Array<{
    id: string;
    label: string;
    price?: number;
    suffix?: string;
    disabled?: boolean;
    onClick?: () => void;
    highlight?: boolean;
  }>;
  className?: string;
}

// Section of menu items
export function JonesMenuSection({ items, className = '' }: JonesMenuSectionProps) {
  return (
    <div className={`space-y-0 ${className}`}>
      {items.map((item) => (
        <JonesMenuItem
          key={item.id}
          label={item.label}
          price={item.price}
          suffix={item.suffix}
          disabled={item.disabled}
          onClick={item.onClick}
          highlight={item.highlight}
        />
      ))}
    </div>
  );
}

interface JonesListSectionProps {
  items: Array<{
    id: string;
    label: string;
    disabled?: boolean;
    onClick?: () => void;
    active?: boolean;
  }>;
  className?: string;
}

// Section of list items (for employers, courses, etc.)
export function JonesListSection({ items, className = '' }: JonesListSectionProps) {
  return (
    <div className={`space-y-0 ${className}`}>
      {items.map((item) => (
        <JonesListItem
          key={item.id}
          label={item.label}
          disabled={item.disabled}
          onClick={item.onClick}
          active={item.active}
        />
      ))}
    </div>
  );
}

// Info display row (for showing stats like "Savings: 500g")
interface JonesInfoRowProps {
  label: string;
  value: string | number;
  valueClass?: string;
  darkText?: boolean;
  largeText?: boolean;
}

export function JonesInfoRow({ label, value, valueClass = '', darkText = false, largeText = false }: JonesInfoRowProps) {
  const textSize = largeText ? 'text-base' : 'text-sm';
  return (
    <div className={`flex justify-between items-baseline font-mono ${textSize} py-0.5 px-2`}>
      <span className={darkText ? 'text-[#6b5a42]' : 'text-[#a09080]'}>{label}</span>
      <span className={`font-bold ${darkText ? 'text-[#3d2a14]' : 'text-[#e0d4b8]'} ${valueClass}`}>{value}</span>
    </div>
  );
}

// Action button styled like Jones
interface JonesButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function JonesButton({
  label,
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
}: JonesButtonProps) {
  const baseClasses = 'font-mono text-sm py-1.5 px-4 rounded transition-colors';
  const variantClasses = variant === 'primary'
    ? 'bg-[#c9a227] text-[#2d1f0f] hover:bg-[#d4b33c] font-bold'
    : 'bg-[#5c4a32] text-[#e0d4b8] hover:bg-[#6d5a42]';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variantClasses}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {label}
    </button>
  );
}
