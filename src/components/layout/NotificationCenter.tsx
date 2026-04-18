import { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, UserPlus, CalendarOff, Truck, FileEdit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

function eventIcon(type: string) {
  switch (type) {
    case 'driver_created':
      return <UserPlus className="h-4 w-4 text-emerald-500" />;
    case 'driver_absence':
      return <CalendarOff className="h-4 w-4 text-amber-500" />;
    case 'tour_created':
      return <Truck className="h-4 w-4 text-primary" />;
    case 'planning_updated':
      return <FileEdit className="h-4 w-4 text-blue-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, remove } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleClick = async (n: AppNotification) => {
    if (!n.is_read) await markAsRead(n.id);
    if (n.link_url) {
      navigate(n.link_url);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full relative"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-[10px] flex items-center justify-center rounded-full"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0" sideOffset={8}>
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {unreadCount} non lues
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 h-7"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3" />
              Tout lire
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[420px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Aucune notification
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'p-3 hover:bg-muted/50 transition-colors cursor-pointer group',
                    !n.is_read && 'bg-primary/5'
                  )}
                  onClick={() => handleClick(n)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{eventIcon(n.event_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'text-sm leading-tight',
                            !n.is_read && 'font-semibold'
                          )}
                        >
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      {n.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          {n.actor_name && <>par {n.actor_name} • </>}
                          {formatDistanceToNow(new Date(n.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(n.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
