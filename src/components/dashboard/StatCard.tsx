import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  className?: string;
  delay?: number;
}

export function StatCard({ 
  title, 
  value, 
  subtitle,
  icon, 
  trend, 
  trendValue,
  variant = 'default',
  className,
  delay = 0
}: StatCardProps) {
  const variantStyles = {
    default: 'border-border/50',
    success: 'border-success/30 bg-success/5',
    danger: 'border-destructive/30 bg-destructive/5',
    warning: 'border-warning/30 bg-warning/5',
  };

  const iconBgStyles = {
    default: 'bg-primary/20 text-primary',
    success: 'bg-success/20 text-success',
    danger: 'bg-destructive/20 text-destructive',
    warning: 'bg-warning/20 text-warning',
  };

  const valueStyles = {
    default: 'text-foreground',
    success: 'text-success',
    danger: 'text-destructive',
    warning: 'text-warning',
  };

  return (
    <div 
      className={cn(
        "stat-card opacity-0 animate-slide-up",
        variantStyles[variant],
        className
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBgStyles[variant])}>
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-sm px-2 py-1 rounded-full",
            trend === 'up' && "bg-success/10 text-success",
            trend === 'down' && "bg-destructive/10 text-destructive",
            trend === 'neutral' && "bg-muted text-muted-foreground"
          )}>
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {trend === 'neutral' && <Minus className="w-3 h-3" />}
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className={cn("text-2xl lg:text-3xl font-bold tracking-tight", valueStyles[variant])}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
