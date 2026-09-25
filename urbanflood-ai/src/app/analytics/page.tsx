'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DemoBadge } from '@/components/shared/demo-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { useCity } from '@/context/city-context';
import { BarChart, Activity, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AnalyticsPage() {
  const { currentCity, isCityConfigured, isLoading } = useCity();


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
          description="Analytics are not available for this city."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto w-full p-4 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <BarChart className="h-5 w-5 text-chart-purple" />
            Performance Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            System performance and prediction accuracy metrics.
          </p>
        </div>
        <div className="flex items-center gap-4">
           <DemoBadge label="MODELLED" />
           <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Export Report
           </Button>
        </div>
      </div>

      {/* Content */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <Card className="col-span-full">
               <CardHeader className="px-6 py-4 border-b border-border">
                  <CardTitle className="text-base flex items-center justify-between">
                      Model Accuracy Overview
                      <Badge variant="outline" className="text-risk-low border-risk-low/50">High Confidence</Badge>
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-6">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                       <div>
                           <div className="text-sm text-muted-foreground mb-1">True Positive Rate</div>
                           <div className="text-3xl font-bold text-foreground">87.4%</div>
                           <div className="text-xs text-risk-low mt-1">↑ 2.1% from last month</div>
                       </div>
                        <div>
                           <div className="text-sm text-muted-foreground mb-1">False Alarm Rate</div>
                           <div className="text-3xl font-bold text-foreground">12.1%</div>
                           <div className="text-xs text-risk-low mt-1">↓ 0.5% from last month</div>
                       </div>
                        <div>
                           <div className="text-sm text-muted-foreground mb-1">Avg Lead Time</div>
                           <div className="text-3xl font-bold text-foreground">42m</div>
                           <div className="text-xs text-risk-low mt-1">↑ 5m improvement</div>
                       </div>
                        <div>
                           <div className="text-sm text-muted-foreground mb-1">Data Ingestion Latency</div>
                           <div className="text-3xl font-bold text-foreground">1.2s</div>
                           <div className="text-xs text-muted-foreground mt-1">Stable</div>
                       </div>
                   </div>
               </CardContent>
           </Card>

            <Card className="col-span-1 lg:col-span-2">
                <CardHeader className="px-6 py-4">
                  <CardTitle className="text-sm">Prediction vs Observation Trends</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0 h-[300px] flex items-center justify-center bg-muted/20 border border-dashed border-border rounded-md m-6 mt-0">
                    <div className="text-center">
                        <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <div className="text-sm text-muted-foreground">Chart placeholder</div>
                        <div className="text-xs text-muted-foreground mt-1 max-w-[200px]">Time-series visualization of model performance over the last 30 days.</div>
                    </div>
                </CardContent>
            </Card>

            <Card className="col-span-1">
                 <CardHeader className="px-6 py-4">
                  <CardTitle className="text-sm">System Health</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0">
                    <div className="space-y-4">
                         <div>
                             <div className="flex justify-between text-sm mb-1">
                                 <span>API Gateway</span>
                                 <span className="text-risk-low">99.9%</span>
                             </div>
                             <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                 <div className="h-full bg-risk-low w-[99.9%]" />
                             </div>
                         </div>
                         <div>
                             <div className="flex justify-between text-sm mb-1">
                                 <span>Data Ingestion pipeline</span>
                                 <span className="text-risk-low">99.5%</span>
                             </div>
                             <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                 <div className="h-full bg-risk-low w-[99.5%]" />
                             </div>
                         </div>
                          <div>
                             <div className="flex justify-between text-sm mb-1">
                                 <span>Prediction Engine</span>
                                 <span className="text-risk-watch">97.2%</span>
                             </div>
                             <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                 <div className="h-full bg-risk-watch w-[97.2%]" />
                             </div>
                         </div>
                          <div>
                             <div className="flex justify-between text-sm mb-1">
                                 <span>Storage</span>
                                 <span className="text-risk-low">99.9%</span>
                             </div>
                             <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                 <div className="h-full bg-risk-low w-[99.9%]" />
                             </div>
                         </div>
                    </div>
                </CardContent>
            </Card>
       </div>
    </div>
  );
}
