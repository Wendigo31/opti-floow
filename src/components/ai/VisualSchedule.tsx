import React from 'react';
import { 
  Car, 
  Coffee, 
  Moon, 
  Fuel, 
  Users, 
  MapPin,
  Clock,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleSegment {
  from: string;
  to: string;
  distance: number;
  duration: number;
  driver: string;
  type: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

interface VisualScheduleProps {
  segments: ScheduleSegment[];
  departureTime?: string;
  arrivalTime?: string;
}

const getSegmentConfig = (type: string) => {
  switch (type.toLowerCase()) {
    case 'driving':
      return {
        icon: Car,
        label: 'Conduite',
        bgColor: 'bg-primary/20',
        borderColor: 'border-primary',
        textColor: 'text-primary',
        fillColor: 'bg-primary',
      };
    case 'rest':
      return {
        icon: Coffee,
        label: 'Pause',
        bgColor: 'bg-amber-500/20',
        borderColor: 'border-amber-500',
        textColor: 'text-amber-600',
        fillColor: 'bg-amber-500',
      };
    case 'overnight':
    case 'sleep':
      return {
        icon: Moon,
        label: 'Repos nuit',
        bgColor: 'bg-indigo-500/20',
        borderColor: 'border-indigo-500',
        textColor: 'text-indigo-600',
        fillColor: 'bg-indigo-500',
      };
    case 'relay':
      return {
        icon: Users,
        label: 'Relais',
        bgColor: 'bg-emerald-500/20',
        borderColor: 'border-emerald-500',
        textColor: 'text-emerald-600',
        fillColor: 'bg-emerald-500',
      };
    case 'refuel':
      return {
        icon: Fuel,
        label: 'Ravitaillement',
        bgColor: 'bg-cyan-500/20',
        borderColor: 'border-cyan-500',
        textColor: 'text-cyan-600',
        fillColor: 'bg-cyan-500',
      };
    case 'meal':
      return {
        icon: Coffee,
        label: 'Repas',
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-500',
        textColor: 'text-orange-600',
        fillColor: 'bg-orange-500',
      };
    default:
      return {
        icon: MapPin,
        label: type,
        bgColor: 'bg-muted',
        borderColor: 'border-muted-foreground/30',
        textColor: 'text-muted-foreground',
        fillColor: 'bg-muted-foreground',
      };
  }
};

const formatDuration = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
};

// Calculate total duration for proportional widths
const getTotalDuration = (segments: ScheduleSegment[]) => {
  return segments.reduce((sum, seg) => sum + seg.duration, 0);
};

export function VisualSchedule({ segments, departureTime, arrivalTime }: VisualScheduleProps) {
  if (!segments || segments.length === 0) {
    return null;
  }

  const totalDuration = getTotalDuration(segments);
  const totalDistance = segments.reduce((sum, seg) => sum + (seg.distance || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header with times */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-medium">Départ: {departureTime || segments[0]?.startTime || '--:--'}</span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span>{totalDistance.toFixed(0)} km</span>
          <span>•</span>
          <span>{formatDuration(totalDuration)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Arrivée: {arrivalTime || segments[segments.length - 1]?.endTime || '--:--'}</span>
          <Timer className="w-4 h-4 text-success" />
        </div>
      </div>

      {/* Timeline bar */}
      <div className="relative">
        <div className="flex h-12 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
          {segments.map((segment, index) => {
            const config = getSegmentConfig(segment.type);
            const widthPercent = (segment.duration / totalDuration) * 100;
            const Icon = config.icon;

            return (
              <div
                key={index}
                className={cn(
                  "relative flex items-center justify-center transition-all hover:brightness-110 cursor-pointer group",
                  config.fillColor
                )}
                style={{ width: `${Math.max(widthPercent, 3)}%` }}
                title={`${config.label}: ${segment.from} → ${segment.to} (${formatDuration(segment.duration)})`}
              >
                {widthPercent > 8 && (
                  <Icon className="w-4 h-4 text-white drop-shadow" />
                )}
                
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                  <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[200px] text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={cn("w-4 h-4", config.textColor)} />
                      <span className="font-semibold">{config.label}</span>
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                      {segment.startTime && segment.endTime && (
                        <p>{segment.startTime} → {segment.endTime}</p>
                      )}
                      <p>{segment.from} → {segment.to}</p>
                      {segment.distance > 0 && <p>{segment.distance} km</p>}
                      <p className="font-medium text-foreground">{formatDuration(segment.duration)}</p>
                      {segment.driver && <p>🚛 {segment.driver}</p>}
                      {segment.notes && <p className="italic text-xs">{segment.notes}</p>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Time markers below */}
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          {segments.filter((_, i, arr) => i === 0 || i === arr.length - 1 || segments[i].type !== 'driving').map((segment, index) => (
            <span key={index} className="first:text-left last:text-right">
              {segment.startTime}
            </span>
          )).slice(0, 5)}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-2">
        {['driving', 'rest', 'relay', 'overnight', 'refuel', 'meal'].map((type) => {
          const hasType = segments.some(s => s.type.toLowerCase() === type);
          if (!hasType) return null;
          
          const config = getSegmentConfig(type);
          const Icon = config.icon;
          
          return (
            <div key={type} className="flex items-center gap-1.5 text-xs">
              <div className={cn("w-3 h-3 rounded-sm", config.fillColor)} />
              <Icon className={cn("w-3 h-3", config.textColor)} />
              <span className="text-muted-foreground">{config.label}</span>
            </div>
          );
        })}
      </div>

      {/* Detailed segments list */}
      <div className="space-y-2 mt-4">
        {segments.map((segment, index) => {
          const config = getSegmentConfig(segment.type);
          const Icon = config.icon;

          return (
            <div
              key={index}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-l-4 transition-colors",
                config.bgColor,
                config.borderColor
              )}
            >
              <div className={cn("p-2 rounded-lg", config.fillColor)}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{config.label}</span>
                  {segment.driver && (
                    <span className="text-xs px-2 py-0.5 bg-background/60 rounded text-muted-foreground">
                      {segment.driver}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {segment.from} → {segment.to}
                </p>
              </div>

              <div className="text-right text-sm">
                <p className="font-medium text-foreground">{formatDuration(segment.duration)}</p>
                {segment.startTime && segment.endTime && (
                  <p className="text-xs text-muted-foreground">
                    {segment.startTime} - {segment.endTime}
                  </p>
                )}
              </div>

              {segment.distance > 0 && (
                <div className="text-right text-sm pl-3 border-l border-border/50">
                  <p className="font-medium text-foreground">{segment.distance} km</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
