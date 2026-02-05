// Jones-Style Panel Components
// Provides standardized layout matching Jones in the Fast Lane UI
// - Items with dotted lines connecting names to prices (like "Hamburgers........ $83")
// - Clean list format for locations, employers, etc.

import React from 'react';

interface JonesMenuItemProps {
  label: string;
  price?: number;
  suffix?: string; // For things like "/hr" or "/week"
  disabled?: boolean;
  onClick?: () => void;
  highlight?: boolean;
  className?: string;
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
}: JonesMenuItemProps) {
  const content = (
    <div
      className={`
        flex items-baseline w-full font-mono text-sm
        ${disabled ? 'opacity-50' : ''}
        ${highlight ? 'text-gold font-bold' : 'text-[#e0d4b8]'}
        ${className}
      `}
    >
      <span className="whitespace-nowrap">{label}</span>
      {price !== undefined && (
        <>
          <span className="flex-1 border-b border-dotted border-[#8b7355] mx-1 mb-1"></span>
          <span className="whitespace-nowrap text-gold font-bold">
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
        className="w-full text-left py-1 px-2 hover:bg-[#5c4a32] transition-colors rounded"
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
}

// Simple list item (for employers, education options, etc.)
export function JonesListItem({
  label,
  disabled = false,
  onClick,
  active = false,
  className = '',
}: JonesListItemProps) {
  const content = (
    <div
      className={`
        font-mono text-sm
        ${disabled ? 'opacity-50' : ''}
        ${active ? 'text-gold font-bold' : 'text-[#e0d4b8]'}
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
        className="w-full text-left py-1 px-2 hover:bg-[#5c4a32] transition-colors rounded"
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
}

export function JonesInfoRow({ label, value, valueClass = '' }: JonesInfoRowProps) {
  return (
    <div className="flex justify-between items-baseline font-mono text-sm py-0.5 px-2">
      <span className="text-[#a09080]">{label}</span>
      <span className={`text-[#e0d4b8] font-bold ${valueClass}`}>{value}</span>
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
