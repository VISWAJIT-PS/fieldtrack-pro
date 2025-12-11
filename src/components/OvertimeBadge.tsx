import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OvertimeBadgeProps {
  hours: number;
  className?: string;
}

export function OvertimeBadge({ hours, className }: OvertimeBadgeProps) {
  if (hours <= 0) return null;

  return (
    <Badge
      className={cn(
        'gap-1 bg-warning/10 text-warning hover:bg-warning/20',
        className
      )}
    >
      <Clock className="h-3 w-3" />
      +{hours.toFixed(1)}h OT
    </Badge>
  );
}
