'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { RainfallReading } from '@/types';

interface RainfallChartProps {
  data: RainfallReading[];
  height?: number;
  showAccumulation?: boolean;
}

export function RainfallChart({ data, height = 200, showAccumulation = false }: RainfallChartProps) {
  const chartData = data.map((d, i) => ({
    index: i,
    time: new Date(d.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    intensity: d.intensityMmHr,
    accumulation: d.accumulationMm,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="rainfallGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="accumulationGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          label={{ value: 'mm/hr', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' }, offset: 20 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'oklch(0.17 0.007 260)',
            border: '1px solid oklch(0.28 0.01 260)',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#e2e8f0',
          }}
          labelStyle={{ color: '#94a3b8' }}
        />
        <ReferenceLine y={60} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'Heavy', position: 'right', style: { fontSize: 9, fill: '#f97316' } }} />
        <Area
          type="monotone"
          dataKey="intensity"
          stroke="#3b82f6"
          fill="url(#rainfallGradient)"
          strokeWidth={2}
          name="Intensity (mm/hr)"
        />
        {showAccumulation && (
          <Area
            type="monotone"
            dataKey="accumulation"
            stroke="#06b6d4"
            fill="url(#accumulationGradient)"
            strokeWidth={1.5}
            name="Accumulation (mm)"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
