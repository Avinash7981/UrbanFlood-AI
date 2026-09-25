import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DemoBadgeProps {
  className?: string;
  label?: string;
}

export function DemoBadge({ className, label = 'MODELLED' }: DemoBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'border-primary/30 bg-primary/10 text-primary text-[9px] font-semibold tracking-wider px-1.5 py-0',
        className
      )}
    >
      {label}
    </Badge>
  );
}
