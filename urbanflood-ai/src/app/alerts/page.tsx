'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DemoBadge } from '@/components/shared/demo-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { useCity } from '@/context/city-context';
import { useRisk } from '@/context/risk-context';
import { AlertCard } from '@/components/alerts/alert-card';
import { Bell, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloodAlert } from '@/types';
import { Button } from '@/components/ui/button';

export default function AlertsPage() {
  const { currentCity, isCityConfigured, isLoading } = useCity();
  const { alerts, activeAlerts } = useRisk();
  
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('active');


  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.status === filter).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading city data...</p>
      </div>
    );
  }

  if (!currentCity) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No city data available.</p>
      </div>
    );
  }

  if (!isCityConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          type="not-configured"
          title={`${currentCity?.name} is not yet configured`}
          description="Alert management is not available for this city."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Alerts & Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage active flood warnings and system notifications for {currentCity?.name}.
          </p>
        </div>
        <DemoBadge label="MODELLED" />
      </div>

      {/* KPI / Filter Strip */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Card className="flex-1 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setFilter('active')}>
              <CardContent className={cn("p-4 flex items-center justify-between", filter === 'active' && "ring-2 ring-primary bg-primary/5 rounded-xl")}>
                  <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Active Alerts</div>
                      <div className="text-2xl font-bold text-risk-critical">{activeAlerts.length}</div>
                  </div>
                  <Bell className={cn("h-8 w-8", activeAlerts.length > 0 ? "text-risk-critical" : "text-muted-foreground")} />
              </CardContent>
          </Card>
           <Card className="flex-1 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setFilter('acknowledged')}>
              <CardContent className={cn("p-4 flex items-center justify-between", filter === 'acknowledged' && "ring-2 ring-primary bg-primary/5 rounded-xl")}>
                  <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Acknowledged</div>
                      <div className="text-2xl font-bold">{acknowledgedAlerts.length}</div>
                  </div>
                  <Clock className="h-8 w-8 text-chart-blue" />
              </CardContent>
          </Card>
           <Card className="flex-1 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setFilter('resolved')}>
              <CardContent className={cn("p-4 flex items-center justify-between", filter === 'resolved' && "ring-2 ring-primary bg-primary/5 rounded-xl")}>
                  <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Resolved</div>
                      <div className="text-2xl font-bold text-muted-foreground">{resolvedAlerts.length}</div>
                  </div>
                  <CheckCircle className="h-8 w-8 text-risk-low" />
              </CardContent>
          </Card>
           <Card className="flex-1 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setFilter('all')}>
              <CardContent className={cn("p-4 flex items-center justify-between", filter === 'all' && "ring-2 ring-primary bg-primary/5 rounded-xl")}>
                  <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">All Alerts</div>
                      <div className="text-2xl font-bold">{alerts.length}</div>
                  </div>
                  <div className="text-xs text-muted-foreground underline">View All</div>
              </CardContent>
          </Card>
      </div>

      {/* Main content list */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="px-4 py-3 border-b border-border bg-muted/30">
            <CardTitle className="text-sm capitalize">{filter} Alerts</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0">
             {filteredAlerts.length === 0 ? (
                 <div className="flex items-center justify-center h-full p-8">
                     <EmptyState type="no-data" title={`No ${filter} alerts`} description={`There are currently no ${filter} alerts for this city.`} />
                 </div>
             ) : (
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                        {filteredAlerts.map(alert => (
                            <AlertCard 
                                key={alert.id} 
                                alert={alert} 
                                onAcknowledge={alert.status === 'active' ? () => console.log('Acknowledge', alert.id) : undefined}
                                onViewOnMap={() => console.log('View on map', alert.id)}
                            />
                        ))}
                    </div>
                </ScrollArea>
             )}
        </CardContent>
      </Card>
    </div>
  );
}
