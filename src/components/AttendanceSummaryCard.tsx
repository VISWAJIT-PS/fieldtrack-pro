import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface AttendanceSummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-accent border-primary/20',
  success: 'bg-success/10 border-success/20',
  warning: 'bg-warning/10 border-warning/20',
  destructive: 'bg-destructive/10 border-destructive/20',
};

const iconVariantStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export function AttendanceSummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: AttendanceSummaryCardProps) {
  return (
    <Card
      className={cn(
        'animate-fade-in overflow-hidden transition-all hover:shadow-soft',
        variantStyles[variant],
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p
                className={cn(
                  'text-xs font-medium',
                  trend.value >= 0 ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%{' '}
                {trend.label}
              </p>
            )}
          </div>
          <div
            className={cn(
              'rounded-xl p-3',
              iconVariantStyles[variant]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
