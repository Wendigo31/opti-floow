import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Clock, 
  Truck, 
  Container, 
  Route, 
  User,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  History
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserLicenseId } from '@/hooks/useDataSync';

interface ActivityItem {
  id: string;
  type: 'vehicle' | 'trailer' | 'tour' | 'driver';
  action: 'created' | 'updated' | 'deleted';
  itemName: string;
  userEmail: string;
  displayName?: string;
  timestamp: string;
  isOwn: boolean;
}

export function ActivityHistory() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);
      const licenseId = await getUserLicenseId(user.id);
      if (!licenseId) {
        setLoading(false);
        return;
      }

      // Fetch company members for display names
      const { data: members } = await supabase
        .from('company_users')
        .select('user_id, email, display_name')
        .eq('license_id', licenseId)
        .eq('is_active', true);

      const memberMap = new Map<string, { email: string; displayName?: string }>();
      members?.forEach(m => {
        memberMap.set(m.user_id, { 
          email: m.email, 
          displayName: m.display_name || undefined 
        });
      });

      const allActivities: ActivityItem[] = [];

      // Fetch recent vehicles
      const { data: vehicles } = await supabase
        .from('user_vehicles')
        .select('id, local_id, name, user_id, created_at, updated_at')
        .eq('license_id', licenseId)
        .order('updated_at', { ascending: false })
        .limit(20);

      vehicles?.forEach(v => {
        const member = memberMap.get(v.user_id);
        const isNew = new Date(v.created_at).getTime() === new Date(v.updated_at).getTime();
        allActivities.push({
          id: `vehicle-${v.id}`,
          type: 'vehicle',
          action: isNew ? 'created' : 'updated',
          itemName: v.name,
          userEmail: member?.email || 'Inconnu',
          displayName: member?.displayName,
          timestamp: v.updated_at,
          isOwn: v.user_id === user.id,
        });
      });

      // Fetch recent trailers
      const { data: trailers } = await supabase
        .from('user_trailers')
        .select('id, local_id, name, user_id, created_at, updated_at')
        .eq('license_id', licenseId)
        .order('updated_at', { ascending: false })
        .limit(20);

      trailers?.forEach(t => {
        const member = memberMap.get(t.user_id);
        const isNew = new Date(t.created_at).getTime() === new Date(t.updated_at).getTime();
        allActivities.push({
          id: `trailer-${t.id}`,
          type: 'trailer',
          action: isNew ? 'created' : 'updated',
          itemName: t.name,
          userEmail: member?.email || 'Inconnu',
          displayName: member?.displayName,
          timestamp: t.updated_at,
          isOwn: t.user_id === user.id,
        });
      });

      // Fetch recent tours
      const { data: tours } = await supabase
        .from('saved_tours')
        .select('id, name, user_id, created_at, updated_at')
        .eq('license_id', licenseId)
        .order('updated_at', { ascending: false })
        .limit(20);

      tours?.forEach(t => {
        const member = memberMap.get(t.user_id);
        const isNew = new Date(t.created_at).getTime() === new Date(t.updated_at).getTime();
        allActivities.push({
          id: `tour-${t.id}`,
          type: 'tour',
          action: isNew ? 'created' : 'updated',
          itemName: t.name,
          userEmail: member?.email || 'Inconnu',
          displayName: member?.displayName,
          timestamp: t.updated_at,
          isOwn: t.user_id === user.id,
        });
      });

      // Fetch recent drivers
      const { data: drivers } = await supabase
        .from('user_drivers')
        .select('id, local_id, name, user_id, created_at, updated_at')
        .eq('license_id', licenseId)
        .order('updated_at', { ascending: false })
        .limit(20);

      drivers?.forEach(d => {
        const member = memberMap.get(d.user_id);
        const isNew = new Date(d.created_at).getTime() === new Date(d.updated_at).getTime();
        allActivities.push({
          id: `driver-${d.id}`,
          type: 'driver',
          action: isNew ? 'created' : 'updated',
          itemName: d.name,
          userEmail: member?.email || 'Inconnu',
          displayName: member?.displayName,
          timestamp: d.updated_at,
          isOwn: d.user_id === user.id,
        });
      });

      // Sort by timestamp and take most recent
      allActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allActivities.slice(0, 50));
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const getTypeIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'vehicle': return <Truck className="w-4 h-4" />;
      case 'trailer': return <Container className="w-4 h-4" />;
      case 'tour': return <Route className="w-4 h-4" />;
      case 'driver': return <User className="w-4 h-4" />;
    }
  };

  const getActionIcon = (action: ActivityItem['action']) => {
    switch (action) {
      case 'created': return <Plus className="w-3 h-3" />;
      case 'updated': return <Edit className="w-3 h-3" />;
      case 'deleted': return <Trash2 className="w-3 h-3" />;
    }
  };

  const getActionColor = (action: ActivityItem['action']) => {
    switch (action) {
      case 'created': return 'bg-green-500/20 text-green-600';
      case 'updated': return 'bg-blue-500/20 text-blue-600';
      case 'deleted': return 'bg-red-500/20 text-red-600';
    }
  };

  const getTypeLabel = (type: ActivityItem['type']) => {
    switch (type) {
      case 'vehicle': return 'Véhicule';
      case 'trailer': return 'Remorque';
      case 'tour': return 'Tournée';
      case 'driver': return 'Conducteur';
    }
  };

  const getActionLabel = (action: ActivityItem['action']) => {
    switch (action) {
      case 'created': return 'Créé';
      case 'updated': return 'Modifié';
      case 'deleted': return 'Supprimé';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historique des modifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historique des modifications
            </CardTitle>
            <CardDescription>
              Dernières activités de l'équipe
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchActivities}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>Aucune activité récente</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {activities.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {getTypeIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{activity.itemName}</span>
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(activity.type)}
                      </Badge>
                      <Badge className={`text-xs ${getActionColor(activity.action)}`}>
                        {getActionIcon(activity.action)}
                        <span className="ml-1">{getActionLabel(activity.action)}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className={activity.isOwn ? 'text-primary font-medium' : ''}>
                        {activity.isOwn ? 'Vous' : (activity.displayName || activity.userEmail.split('@')[0])}
                      </span>
                      <span>•</span>
                      <span title={format(new Date(activity.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}>
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
