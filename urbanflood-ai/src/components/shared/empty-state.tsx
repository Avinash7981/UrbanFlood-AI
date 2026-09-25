import { cn } from '@/lib/utils';
import { AlertCircle, Database, MapPin, CloudOff } from 'lucide-react';

type EmptyStateType = 'no-data' | 'not-configured' | 'unavailable' | 'model-unavailable';

interface EmptyStateProps {
  type: EmptyStateType;
  title: string;
  description: string;
  className?: string;
}

const icons: Record<EmptyStateType, React.ElementType> = {
  'no-data': Database,
  'not-configured': MapPin,
  'unavailable': CloudOff,
  'model-unavailable': AlertCircle,
};

export function EmptyState({ type, title, description, className }: EmptyStateProps) {
  const Icon = icons[type];
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-xs">{description}</p>
      </div>
    </div>
  );
}
