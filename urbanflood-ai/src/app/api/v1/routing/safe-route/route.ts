import { NextRequest, NextResponse } from 'next/server';
import { calculateSafeRoutes, DEFAULT_ROUTING_POLICY } from '@/lib/services/safe-routing';
import { RouteRequest, NowcastZone, RoutingPolicy } from '@/types';
import { hyderabadFloodZones } from '@/data/cities/hyderabad/flood-zones';

/**
 * POST /api/v1/routing/safe-route
 * Accepts: { origin, destination, forecastMinutes?, nowcastZones?, policy? }
 * Returns: SafeRoutingResult
 *
 * ROUTING DATA SOURCE: OSRM / OpenStreetMap contributors
 * FLOOD RISK SOURCE: UrbanFlood AI Coupled Flood Risk Engine (NowcastZone data)
 *
 * DISCLAIMER: Decision-support prototype only.
 * Routes are NOT guaranteed safe. Flood risk is modelled, not field-verified.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const request: RouteRequest = {
      origin: body.origin,
      destination: body.destination,
      forecastMinutes: body.forecastMinutes ?? 0,
    };

    if (
      !request.origin ||
      !request.destination ||
      typeof request.origin.latitude !== 'number' ||
      typeof request.origin.longitude !== 'number' ||
      typeof request.destination.latitude !== 'number' ||
      typeof request.destination.longitude !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Invalid request: origin and destination with latitude/longitude are required.' },
        { status: 400 }
      );
    }

    const nowcastZones: NowcastZone[] = Array.isArray(body.nowcastZones) ? body.nowcastZones : [];
    const floodZoneFeatures = hyderabadFloodZones.features;
    const policy: RoutingPolicy = { ...DEFAULT_ROUTING_POLICY, ...(body.policy || {}) };

    const result = await calculateSafeRoutes(request, nowcastZones, floodZoneFeatures, policy);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[routing/safe-route] Error:', err);
    return NextResponse.json({ error: 'Routing service error.' }, { status: 500 });
  }
}
