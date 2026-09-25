import { FloodZoneCollection } from '@/types';

// Realistic flood zone polygons across Hyderabad
// Based on known flood-prone areas: Musi River corridor, Hussain Sagar overflow,
// Kukatpally nala, Begumpet low-lying, and other documented vulnerable zones
export const hyderabadFloodZones: FloodZoneCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.440, 17.370], [78.455, 17.370], [78.458, 17.378],
          [78.460, 17.388], [78.452, 17.392], [78.442, 17.390],
          [78.436, 17.382], [78.438, 17.374], [78.440, 17.370],
        ]],
      },
      properties: {
        id: 'zone-01',
        name: 'Musi River — Chaderghat',
        riskLevel: 'critical',
        probability: 87,
        severity: 'severe',
        estimatedOnsetMinutes: 45,
        confidence: 82,
        factors: [
          { icon: '🌧', label: 'Heavy rainfall', description: 'Sustained intensity >60mm/hr', contribution: 'high' },
          { icon: '⛰', label: 'Low-lying terrain', description: 'Elevation 480m, below surroundings by 8m', contribution: 'high' },
          { icon: '🚰', label: 'Drainage stress', description: 'Multiple nalas converge, high flow', contribution: 'high' },
          { icon: '🏙', label: 'Impervious surface', description: '82% built-up area, minimal absorption', contribution: 'medium' },
        ],
        isDemo: true,
        lastAssessed: new Date().toISOString(),
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.470, 17.430], [78.485, 17.428], [78.490, 17.435],
          [78.488, 17.444], [78.478, 17.448], [78.468, 17.442],
          [78.466, 17.435], [78.470, 17.430],
        ]],
      },
      properties: {
        id: 'zone-02',
        name: 'Hussain Sagar — Khairatabad',
        riskLevel: 'high',
        probability: 72,
        severity: 'high',
        estimatedOnsetMinutes: 60,
        confidence: 75,
        factors: [
          { icon: '🌧', label: 'Heavy rainfall', description: 'Moderate-high intensity in catchment', contribution: 'high' },
          { icon: '💧', label: 'Lake overflow risk', description: 'Hussain Sagar at high level', contribution: 'high' },
          { icon: '🏙', label: 'Urban density', description: 'Dense commercial zone, poor infiltration', contribution: 'medium' },
        ],
        isDemo: true,
        lastAssessed: new Date().toISOString(),
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.410, 17.460], [78.426, 17.458], [78.430, 17.465],
          [78.428, 17.475], [78.418, 17.478], [78.408, 17.472],
          [78.406, 17.464], [78.410, 17.460],
        ]],
      },
      properties: {
        id: 'zone-03',
        name: 'Kukatpally Nala Corridor',
        riskLevel: 'high',
        probability: 68,
        severity: 'high',
        estimatedOnsetMinutes: 55,
        confidence: 70,
        factors: [
          { icon: '🚰', label: 'Drainage bottleneck', description: 'Kukatpally nala constricted at bridge crossings', contribution: 'high' },
          { icon: '🌧', label: 'Upstream rainfall', description: 'Heavy rain in upstream catchment', contribution: 'high' },
          { icon: '🏗', label: 'Encroachment', description: 'Nala encroachment reducing flow capacity', contribution: 'medium' },
        ],
        isDemo: true,
        lastAssessed: new Date().toISOString(),
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.500, 17.400], [78.515, 17.398], [78.520, 17.406],
          [78.518, 17.415], [78.508, 17.418], [78.498, 17.412],
          [78.496, 17.405], [78.500, 17.400],
        ]],
      },
      properties: {
        id: 'zone-04',
        name: 'Uppal — Nacharam',
        riskLevel: 'moderate',
        probability: 45,
        severity: 'moderate',
        estimatedOnsetMinutes: 80,
        confidence: 60,
        factors: [
          { icon: '⛰', label: 'Low elevation', description: 'Depression area near industrial zone', contribution: 'medium' },
          { icon: '🌧', label: 'Moderate rainfall', description: 'Moderate intensity expected', contribution: 'medium' },
          { icon: '🏭', label: 'Industrial runoff', description: 'Poor drainage in industrial areas', contribution: 'low' },
        ],
        isDemo: true,
        lastAssessed: new Date().toISOString(),
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.360, 17.440], [78.378, 17.438], [78.382, 17.446],
          [78.380, 17.455], [78.370, 17.458], [78.358, 17.450],
          [78.356, 17.444], [78.360, 17.440],
        ]],
      },
      properties: {
        id: 'zone-05',
        name: 'Miyapur — Hafeezpet',
        riskLevel: 'moderate',
        probability: 40,
        severity: 'moderate',
        estimatedOnsetMinutes: 90,
        confidence: 58,
        factors: [
          { icon: '🏙', label: 'Rapid urbanization', description: 'Recent construction reducing green cover', contribution: 'medium' },
          { icon: '🚰', label: 'Drainage gaps', description: 'New areas with incomplete drainage', contribution: 'medium' },
        ],
        isDemo: true,
        lastAssessed: new Date().toISOString(),
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.530, 17.355], [78.548, 17.352], [78.555, 17.360],
          [78.552, 17.370], [78.540, 17.374], [78.528, 17.368],
          [78.526, 17.360], [78.530, 17.355],
        ]],
      },
      properties: {
        id: 'zone-06',
        name: 'LB Nagar — Saroornagar',
        riskLevel: 'critical',
        probability: 83,
        severity: 'severe',
        estimatedOnsetMinutes: 40,
        confidence: 78,
        factors: [
          { icon: '⛰', label: 'Low-lying terrain', description: 'Historic lake bed, very low elevation', contribution: 'high' },
          { icon: '🌧', label: 'Heavy rainfall', description: 'Intense rainfall >70mm/hr', contribution: 'high' },
          { icon: '🚰', label: 'Drainage overload', description: 'Saroornagar lake overflow path', contribution: 'high' },
          { icon: '🏙', label: 'Dense population', description: 'High population density, evacuation concern', contribution: 'medium' },
        ],
        isDemo: true,
        lastAssessed: new Date().toISOString(),
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.445, 17.415], [78.460, 17.412], [78.465, 17.420],
          [78.462, 17.430], [78.452, 17.432], [78.443, 17.425],
          [78.442, 17.418], [78.445, 17.415],
        ]],
      },
      properties: {
        id: 'zone-07',
        name: 'Begumpet — Ameerpet',
        riskLevel: 'moderate',
        probability: 38,
        severity: 'low',
        estimatedOnsetMinutes: 95,
        confidence: 55,
        factors: [
          { icon: '🏙', label: 'High impervious surface', description: 'Commercial area, concrete-dominated', contribution: 'medium' },
          { icon: '🌧', label: 'Light-moderate rain', description: 'Forecast shows moderate intensity', contribution: 'low' },
        ],
        isDemo: true,
        lastAssessed: new Date().toISOString(),
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.380, 17.360], [78.398, 17.357], [78.402, 17.365],
          [78.400, 17.376], [78.390, 17.380], [78.378, 17.374],
          [78.375, 17.366], [78.380, 17.360],
        ]],
      },
      properties: {
        id: 'zone-08',
        name: 'Toli Chowki — Tolichowki Nala',
        riskLevel: 'high',
        probability: 65,
        severity: 'moderate',
        estimatedOnsetMinutes: 65,
        confidence: 68,
        factors: [
          { icon: '🚰', label: 'Nala constriction', description: 'Tolichowki nala bottleneck near road crossings', contribution: 'high' },
          { icon: '🌧', label: 'Sustained rainfall', description: 'Continuous rainfall for 3+ hours', contribution: 'medium' },
          { icon: '⛰', label: 'Terrain depression', description: 'Low point collects runoff from Golconda hills', contribution: 'medium' },
        ],
        isDemo: true,
        lastAssessed: new Date().toISOString(),
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.485, 17.345], [78.500, 17.343], [78.505, 17.350],
          [78.503, 17.360], [78.493, 17.363], [78.483, 17.357],
          [78.481, 17.349], [78.485, 17.345],
        ]],
      },
      properties: {
        id: 'zone-09',
        name: 'Malakpet — Dabeerpura',
        riskLevel: 'high',
        probability: 70,
        severity: 'high',
        estimatedOnsetMinutes: 50,
        confidence: 73,
        factors: [
          { icon: '💧', label: 'Musi proximity', description: 'Adjacent to Musi River, flood-prone bank', contribution: 'high' },
          { icon: '⛰', label: 'Low elevation', description: 'Historical flood zone, below river level during surge', contribution: 'high' },
          { icon: '🏙', label: 'Old city density', description: 'Dense old-city construction, poor modern drainage', contribution: 'medium' },
        ],
        isDemo: true,
        lastAssessed: new Date().toISOString(),
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.560, 17.410], [78.575, 17.408], [78.580, 17.416],
          [78.577, 17.425], [78.567, 17.428], [78.558, 17.422],
          [78.556, 17.414], [78.560, 17.410],
        ]],
      },
      properties: {
        id: 'zone-10',
        name: 'Boduppal — Peerzadiguda',
        riskLevel: 'low',
        probability: 22,
        severity: 'low',
        estimatedOnsetMinutes: 120,
        confidence: 50,
        factors: [
          { icon: '🌧', label: 'Light rainfall', description: 'Low intensity expected in this area', contribution: 'low' },
          { icon: '⛰', label: 'Elevated terrain', description: 'Relatively higher ground', contribution: 'low' },
        ],
        isDemo: true,
        lastAssessed: new Date().toISOString(),
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.420, 17.500], [78.438, 17.497], [78.442, 17.505],
          [78.440, 17.515], [78.430, 17.518], [78.418, 17.512],
          [78.416, 17.504], [78.420, 17.500],
        ]],
      },
      properties: {
        id: 'zone-11',
        name: 'KPHB Colony — JNTU',
        riskLevel: 'low',
        probability: 25,
        severity: 'low',
        estimatedOnsetMinutes: 110,
        confidence: 48,
        factors: [
          { icon: '🏙', label: 'Urban development', description: 'Planned colony with basic drainage', contribution: 'low' },
          { icon: '🌧', label: 'Moderate-light rain', description: 'Below threshold for major concern', contribution: 'low' },
        ],
        isDemo: true,
        lastAssessed: new Date().toISOString(),
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [78.455, 17.340], [78.472, 17.337], [78.478, 17.345],
          [78.475, 17.355], [78.465, 17.358], [78.453, 17.352],
          [78.451, 17.344], [78.455, 17.340],
        ]],
      },
      properties: {
        id: 'zone-12',
        name: 'Falaknuma — Chandrayangutta',
        riskLevel: 'critical',
        probability: 90,
        severity: 'severe',
        estimatedOnsetMinutes: 35,
        confidence: 85,
        factors: [
          { icon: '🌧', label: 'Extreme rainfall', description: 'Intensity exceeding 80mm/hr, cell stalled', contribution: 'high' },
          { icon: '⛰', label: 'Valley terrain', description: 'Natural valley collects water from surrounding hills', contribution: 'high' },
          { icon: '🚰', label: 'Drainage failure', description: 'Old drainage system at capacity, multiple blockages reported', contribution: 'high' },
          { icon: '🏙', label: 'Population density', description: 'Very dense residential area, limited evacuation routes', contribution: 'high' },
        ],
        isDemo: true,
        lastAssessed: new Date().toISOString(),
      },
    },
  ],
};
