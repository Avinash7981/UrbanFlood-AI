// ============================================================
// UrbanFlood AI — Core Type Definitions
// ============================================================

// --- GeoJSON Primitives ---
export type GeoJSONPosition = [number, number]; // [lng, lat]

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: GeoJSONPosition[][];
}

export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: GeoJSONPosition[][][];
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: GeoJSONPosition[];
}

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: GeoJSONPosition;
}

export interface GeoJSONFeature<
  G = GeoJSONPolygon | GeoJSONLineString | GeoJSONPoint,
  P = Record<string, unknown>
> {
  type: 'Feature';
  geometry: G;
  properties: P;
}

export interface GeoJSONFeatureCollection<
  G = GeoJSONPolygon | GeoJSONLineString | GeoJSONPoint,
  P = Record<string, unknown>
> {
  type: 'FeatureCollection';
  features: GeoJSONFeature<G, P>[];
}

// --- Risk Levels ---
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  critical: 'Critical',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

// --- City Configuration ---
export type CityStatus = 'active_pilot' | 'configured' | 'not_configured';

export interface DataSourceConfig {
  id: string;
  name: string;
  type: 'rainfall' | 'dem' | 'drainage' | 'landcover' | 'roads' | 'buildings' | 'flood_events';
  /** Current source: 'mock' | 'api' | 'file' */
  provider: 'mock' | 'api' | 'file';
  /** Future source description */
  futureSource?: string;
  /** Supported ingestion formats for this source */
  supportedFormats?: DataFormat[];
  lastUpdated?: string;
  status: 'available' | 'partial' | 'unavailable';
}

export interface CityConfig {
  id: string;
  name: string;
  state: string;
  country: string;
  center: GeoJSONPosition;
  zoom: number;
  bounds?: [GeoJSONPosition, GeoJSONPosition];
  dataSources: DataSourceConfig[];
  enabledLayers: string[];
  status: CityStatus;
  population?: number;
  area?: number; // sq km
  timezone: string;
}

// --- Data Ingestion ---
export type DataFormat =
  | 'geojson'
  | 'csv'
  | 'netcdf'
  | 'geotiff'
  | 'shapefile'
  | 'geopackage'
  | 'kml'
  | 'osm_pbf';

export interface DataIngestionMeta {
  sourceFormat: DataFormat;
  ingestedAt: string;
  normalizedTo: 'internal_geojson';
  recordCount: number;
  qualityScore?: number;
}

// --- Map Configuration ---
export interface MapTileProvider {
  id: string;
  name: string;
  type: 'raster' | 'vector';
  url: string;
  attribution: string;
  maxZoom: number;
  darkVariant?: string;
}

export interface MapConfig {
  defaultProvider: string;
  providers: MapTileProvider[];
  defaultStyle: 'dark' | 'light';
}

// --- Flood Zone ---
export interface FloodZoneProperties {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  probability: number;      // 0-100
  severity: 'low' | 'moderate' | 'high' | 'severe';
  estimatedOnsetMinutes: number;
  confidence: number;       // 0-100
  factors: FloodFactor[];
  isDemo: boolean;
  lastAssessed: string;
}

export interface FloodFactor {
  icon: string;
  label: string;
  description: string;
  contribution: 'low' | 'medium' | 'high';
}

export type FloodZoneFeature = GeoJSONFeature<GeoJSONPolygon, FloodZoneProperties>;
export type FloodZoneCollection = GeoJSONFeatureCollection<GeoJSONPolygon, FloodZoneProperties>;

// --- Rainfall ---
export interface RainfallReading {
  timestamp: string;
  intensityMmHr: number;
  accumulationMm: number;
  source: 'gauge' | 'satellite' | 'radar' | 'mock';
}

export interface RainfallForecastPoint {
  offsetMinutes: number;
  label: string;
  intensityMmHr: number;
  confidence: number;
  isDemo: boolean;
}

export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface WeatherCurrent {
  timestamp: string;
  precipitation: number;
  rain: number;
  showers: number;
  cloud_cover: number;
}

export interface WeatherMinutely15 {
  timestamp: string;
  precipitation: number;
  rain: number;
}

export interface WeatherHourly {
  timestamp: string;
  precipitation: number;
  rain: number;
  precipitation_probability: number;
  showers: number;
  cloud_cover: number;
  surface_pressure: number;
  soil_moisture_0_to_1cm: number;
  soil_moisture_1_to_3cm: number;
}

export interface WeatherDaily {
  timestamp: string;
  rain_sum: number;
  showers_sum: number;
  precipitation_sum: number;
  precipitation_hours: number;
  precipitation_probability_max: number;
}

export interface WeatherData {
  location: WeatherLocation;
  current: WeatherCurrent;
  minutely_15: WeatherMinutely15[];
  hourly: WeatherHourly[];
  daily: WeatherDaily[];
  is_mock?: boolean;
}

export interface RainfallData {
  cityId: string;
  current: RainfallReading;
  history: RainfallReading[];
  forecast: RainfallForecastPoint[];
  affectedAreaSqKm: number;
  lastUpdated: string;
  isDemo: boolean;
}

// --- Drainage ---
export type DrainageStressLevel = 'low' | 'watch' | 'high' | 'critical';

export interface DrainageNodeProperties {
  id: string;
  node_type: string;
  connected_segment_count: number;
  upstream_segment_count: number;
  downstream_segment_count: number;
  collection_area: number | null;
  influence_score: number | null;
  criticality_score: number | null;
  stress_level: DrainageStressLevel;
  stress_score: number | null;
  surcharge_risk: string | null;
  is_demo: boolean;
}

export type DrainageNodeFeature = GeoJSONFeature<GeoJSONPoint, DrainageNodeProperties>;
export type DrainageNodeCollection = GeoJSONFeatureCollection<GeoJSONPoint, DrainageNodeProperties>;

export interface DrainageSegmentProperties {
  id: string;
  type: 'nala' | 'drain';
  source_id: string | null;
  source_type: string;
  category: string | null;
  layer: string | null;
  dr_code: string | null;
  pi_code: string | null;
  nala_id: string | null;
  nala_name: string | null;
  zone_name: string | null;
  length_m: number | null;
  upstream_node_id: string | null;
  downstream_node_id: string | null;
  flow_direction: string | null;
  is_demo: boolean;
  metadata_json?: {
    Govt_Encr?: number;
    Pvt_Encr?: number;
    Rel_Encr?: number;
    Total_Encr?: number;
    Court_Case?: number;
    [key: string]: unknown;
  };
}

export type DrainageSegmentFeature = GeoJSONFeature<GeoJSONLineString, DrainageSegmentProperties>;
export type DrainageSegmentCollection = GeoJSONFeatureCollection<GeoJSONLineString, DrainageSegmentProperties>;

// --- Water Body ---

export interface WaterBodyProperties {
  id: string;
  name: string | null;
  type: string | null;
  area: number | null;
  metadata_json?: {
    Descr_1?: string;
    Descr_2?: string;
    Descr_3?: string;
    PI_CODE?: string;
    LU_Code?: string;
    Shape_Area?: number;
    [key: string]: unknown;
  };
}

export type WaterBodyFeature = GeoJSONFeature<GeoJSONPolygon | GeoJSONMultiPolygon, WaterBodyProperties>;
export type WaterBodyCollection = GeoJSONFeatureCollection<GeoJSONPolygon | GeoJSONMultiPolygon, WaterBodyProperties>;

export interface DrainageNetwork {
  nodes: DrainageNodeCollection;
  segments: DrainageSegmentCollection;
}

export interface DrainageStatistics {
  total_nodes: number;
  total_segments: number;
  healthy_nodes: number;
  watch_nodes: number;
  critical_nodes: number;
  bottleneck_segments: number;
  highest_collection_node_id: string | null;
  highest_stress_node_id: string | null;
  most_critical_node_id: string | null;
}

export interface TraceResponse {
  node_id: string;
  direction: 'upstream' | 'downstream';
  traced_nodes: string[];
  traced_segments: string[];
  node_count: number;
  segment_count: number;
}

export interface SimulateFailureResponse {
  blocked_node_id: string;
  affected_upstream_nodes: string[];
  affected_upstream_segments: string[];
  updated_network: DrainageNetwork;
}

// --- Historical Events ---
export interface HistoricalFloodEvent {
  id: string;
  cityId: string;
  date: string;
  title: string;
  severity: RiskLevel;
  maxRainfallMmHr: number;
  totalRainfallMm: number;
  durationHours: number;
  affectedAreaSqKm: number;
  affectedZones: string[];
  description: string;
  rainfallProgression: RainfallReading[];
  predictedExtent?: GeoJSONFeatureCollection;
  observedExtent?: GeoJSONFeatureCollection;
  metadata: Record<string, string>;
}

// --- Alerts ---
export type AlertSeverity = 'advisory' | 'watch' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'expired';

export interface FloodAlert {
  id: string;
  zoneId: string;
  zoneName: string;
  severity: AlertSeverity;
  riskLevel: RiskLevel;
  currentScore: number;
  predictedScore: number;
  currentLevel: RiskLevel;
  predictedLevel: RiskLevel;
  escalationMinutes: number | null;
  title: string;
  message: string;
  contributingFactors: string[];
  createdAt: string;

  // existing properties to retain UI compatibility
  timestamp: string;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  isDemo: boolean;
  location?: GeoJSONPosition; // keep optional if needed by map
}

// --- Analytics / Model Metrics ---
export interface ModelMetrics {
  precision?: number;
  recall?: number;
  f1Score?: number;
  iou?: number;
  falseAlarmRate?: number;
  missRate?: number;
  avgWarningLeadTimeMinutes?: number;
  isValidated: boolean;
  validationStatus: 'awaiting_validation' | 'demo_metrics' | 'validated';
  lastValidated?: string;
}

export interface DataQualityMetric {
  source: string;
  label: string;
  freshness: 'fresh' | 'stale' | 'unavailable';
  lastUpdated?: string;
  coverage: number;        // 0-100
  availability: 'available' | 'partial' | 'unavailable';
  notes?: string;
}

export interface AnalyticsData {
  modelMetrics: ModelMetrics;
  dataQuality: DataQualityMetric[];
  isDemo: boolean;
}

// --- Nowcast ---
export interface NowcastTimeStep {
  offsetMinutes: number;
  label: string;
  riskLevel: RiskLevel;
  riskScore?: number;
  factorScores?: Record<string, number>;
  explanation?: string[];
}

export interface NowcastZone {
  zoneId: string;
  zoneName: string;
  currentRisk: RiskLevel;
  estimatedOnsetMinutes: number;
  severity: 'low' | 'moderate' | 'high' | 'severe';
  timeline: NowcastTimeStep[];
  factors: FloodFactor[];
  isDemo: boolean;
  metadata?: Record<string, string>;
  elevation?: number;
}

export interface NowcastData {
  cityId: string;
  generatedAt: string;
  horizonMinutes: number;
  zones: NowcastZone[];
  isDemo: boolean;
}

// --- Layer Configuration ---
export interface MapLayerConfig {
  id: string;
  label: string;
  icon: string;
  category: 'base' | 'analytical';
  defaultEnabled: boolean;
  description?: string;
}

// --- Critical Infrastructure ---
export type InfrastructureCategory =
  | 'Hospital'
  | 'Fire Station'
  | 'Police Station'
  | 'Emergency Service'
  | 'School'
  | 'Government Facility'
  | 'Transport Facility'
  | 'Other Critical Facility';

export type ExposureLevel = 'none' | 'low' | 'moderate' | 'high' | 'critical';

export interface CriticalInfrastructure {
  id: string;
  cityId: string;
  name: string;
  category: InfrastructureCategory;
  latitude: number;
  longitude: number;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface InfrastructureExposure {
  infrastructureId: string;
  name: string;
  category: InfrastructureCategory;

  riskScore: number;
  riskLevel: RiskLevel;

  distanceToRiskZoneMeters: number;
  closestZoneId: string;
  exposureLevel: ExposureLevel;

  predictedEscalationMinutes: number | null;
  contributingFactors: string[];

  // Custom response priority
  responsePriorityScore: number;
  responsePriorityLabel: 'low' | 'moderate' | 'high' | 'very_high';
}

export interface CriticalInfrastructureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature<GeoJSONPoint, CriticalInfrastructure>[];
}

// ============================================================
// Flood-Safe Routing Types
// ============================================================

export interface RouteRequest {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  /** Forecast time horizon in minutes (0 = current, 30, 60, 90, 120, 180) */
  forecastMinutes?: number;
}

/**
 * A single spatial segment of a route.
 * The route LineString is divided into chunks; each chunk is evaluated
 * against the nearest NowcastZone to derive its flood risk.
 */
export interface RouteSegment {
  id: string;
  /** GeoJSON LineString for this segment */
  geometry: GeoJSONLineString;
  distanceMeters: number;
  durationSeconds: number;

  /** Flood risk score 0–100 from the selected forecast timestep */
  floodRiskScore: number;
  floodRiskLevel: RiskLevel;

  /** Cost penalty added to duration due to flood risk */
  exposurePenalty: number;

  /** Zone ID that this segment intersects (null if no zone nearby) */
  intersectingZoneId: string | null;

  /** Human-readable factors explaining the risk on this segment */
  contributingFactors: string[];
}

/**
 * A single complete route (fastest or flood-safer), with per-segment
 * flood risk breakdown and an overall exposure score.
 */
export interface SafeRoute {
  id: string;

  /** Full route geometry as a merged LineString */
  geometry: GeoJSONLineString;

  distanceMeters: number;
  durationSeconds: number;

  /**
   * Length-weighted average flood risk score across all segments (0–100).
   * Label explicitly: "Modelled Route Flood Exposure". NOT a guarantee of safety.
   */
  estimatedFloodExposure: number;

  /** Highest flood risk score across all segments */
  maxFloodRiskScore: number;

  /** Risk level derived from maxFloodRiskScore */
  riskLevel: RiskLevel;

  segments: RouteSegment[];

  /** High/Critical risk segment count */
  highRiskSegmentCount: number;
  criticalRiskSegmentCount: number;

  /** Human-readable explanation based on actual calculated factors */
  explanation: string[];

  /** Routing data attribution */
  dataSource: 'osrm/openstreetmap';
}

/**
 * Result returned from the routing engine containing up to two routes.
 * fastest: minimises travel time (OSRM primary route).
 * safer: minimises flood exposure within acceptable time overhead.
 *        null if no meaningful alternative exists or only one candidate returned.
 */
export interface SafeRoutingResult {
  fastest: SafeRoute;
  safer: SafeRoute | null;
  forecastMinutes: number;
  /** Message shown when only one route is available */
  saferRouteMessage: string | null;
  status: 'ok' | 'provider_unavailable' | 'no_route' | 'risk_data_unavailable';
}

/** Configurable routing policy thresholds */
export interface RoutingPolicy {
  /** Maximum acceptable extra travel time for the safer route (%) */
  maxTimeIncreasePct: number;
  /** Minimum flood exposure reduction required to prefer safer route (score points) */
  minRiskReductionScore: number;
  /** Penalty seconds added per unit of normalised risk score */
  penaltySecondsPerRiskUnit: number;
}

