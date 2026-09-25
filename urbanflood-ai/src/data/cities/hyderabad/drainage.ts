import { DrainageNetwork } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const hyderabadDrainage: any = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.380, 17.390], [78.400, 17.385], [78.420, 17.380],
          [78.440, 17.378], [78.460, 17.375], [78.480, 17.372],
          [78.500, 17.370], [78.520, 17.368],
        ],
      },
      properties: {
        id: 'D-101',
        name: 'Musi River — Main Channel',
        type: 'primary',
        stressLevel: 'critical',
        riskIndicator: 'Water level near danger mark — DEMO',
        upstreamIds: [],
        downstreamIds: ['D-102', 'D-103'],
        isPotentialBottleneck: true,
        isDemo: true,
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.410, 17.470], [78.415, 17.460], [78.420, 17.450],
          [78.425, 17.440], [78.430, 17.430], [78.435, 17.420],
          [78.440, 17.410], [78.445, 17.395],
        ],
      },
      properties: {
        id: 'D-102',
        name: 'Kukatpally Nala',
        type: 'primary',
        stressLevel: 'high',
        riskIndicator: 'Potential stress — constriction at bridge crossings',
        upstreamIds: ['D-106'],
        downstreamIds: ['D-101'],
        isPotentialBottleneck: true,
        isDemo: true,
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.475, 17.445], [78.472, 17.438], [78.468, 17.430],
          [78.465, 17.420], [78.460, 17.410], [78.456, 17.400],
          [78.452, 17.390],
        ],
      },
      properties: {
        id: 'D-103',
        name: 'Hussain Sagar Overflow Channel',
        type: 'secondary',
        stressLevel: 'high',
        riskIndicator: 'Lake level elevated — outflow increasing',
        upstreamIds: [],
        downstreamIds: ['D-101'],
        isPotentialBottleneck: false,
        isDemo: true,
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.385, 17.375], [78.390, 17.368], [78.395, 17.362],
          [78.400, 17.358], [78.408, 17.355],
        ],
      },
      properties: {
        id: 'D-104',
        name: 'Tolichowki Nala',
        type: 'secondary',
        stressLevel: 'medium',
        riskIndicator: 'Moderate flow — monitoring recommended',
        upstreamIds: [],
        downstreamIds: ['D-101'],
        isPotentialBottleneck: true,
        isDemo: true,
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.520, 17.360], [78.525, 17.355], [78.530, 17.352],
          [78.540, 17.348], [78.548, 17.345],
        ],
      },
      properties: {
        id: 'D-105',
        name: 'Saroornagar Lake Drain',
        type: 'secondary',
        stressLevel: 'critical',
        riskIndicator: 'Potential stress — HIGH — lake overflow imminent',
        upstreamIds: [],
        downstreamIds: ['D-101'],
        isPotentialBottleneck: true,
        isDemo: true,
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.390, 17.490], [78.395, 17.485], [78.400, 17.480],
          [78.408, 17.475], [78.412, 17.470],
        ],
      },
      properties: {
        id: 'D-106',
        name: 'Miyapur Feeder Nala',
        type: 'tertiary',
        stressLevel: 'medium',
        riskIndicator: 'Elevated flow from upstream development',
        upstreamIds: [],
        downstreamIds: ['D-102'],
        isPotentialBottleneck: false,
        isDemo: true,
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.502, 17.415], [78.505, 17.408], [78.508, 17.402],
          [78.510, 17.395], [78.512, 17.388],
        ],
      },
      properties: {
        id: 'D-107',
        name: 'Uppal Storm Drain',
        type: 'secondary',
        stressLevel: 'low',
        riskIndicator: 'Normal flow conditions',
        upstreamIds: [],
        downstreamIds: ['D-101'],
        isPotentialBottleneck: false,
        isDemo: true,
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.460, 17.355], [78.465, 17.348], [78.470, 17.342],
          [78.475, 17.338],
        ],
      },
      properties: {
        id: 'D-108',
        name: 'Falaknuma Nala',
        type: 'tertiary',
        stressLevel: 'critical',
        riskIndicator: 'Potential stress — HIGH — drainage blockage suspected',
        upstreamIds: [],
        downstreamIds: ['D-101'],
        isPotentialBottleneck: true,
        isDemo: true,
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.450, 17.425], [78.452, 17.418], [78.455, 17.412],
          [78.458, 17.405], [78.460, 17.398],
        ],
      },
      properties: {
        id: 'D-109',
        name: 'Begumpet Drain',
        type: 'tertiary',
        stressLevel: 'normal',
        riskIndicator: 'Normal conditions',
        upstreamIds: [],
        downstreamIds: ['D-103'],
        isPotentialBottleneck: false,
        isDemo: true,
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.560, 17.420], [78.555, 17.415], [78.550, 17.410],
          [78.542, 17.405], [78.535, 17.400],
        ],
      },
      properties: {
        id: 'D-110',
        name: 'Boduppal Drain',
        type: 'tertiary',
        stressLevel: 'normal',
        riskIndicator: 'Normal conditions',
        upstreamIds: [],
        downstreamIds: ['D-107'],
        isPotentialBottleneck: false,
        isDemo: true,
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.430, 17.505], [78.428, 17.498], [78.425, 17.490],
          [78.422, 17.482], [78.418, 17.475],
        ],
      },
      properties: {
        id: 'D-111',
        name: 'KPHB Storm Water Drain',
        type: 'secondary',
        stressLevel: 'low',
        riskIndicator: 'Low stress — within capacity',
        upstreamIds: [],
        downstreamIds: ['D-102'],
        isPotentialBottleneck: false,
        isDemo: true,
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [78.490, 17.440], [78.488, 17.432], [78.485, 17.425],
          [78.482, 17.418], [78.480, 17.410],
        ],
      },
      properties: {
        id: 'D-112',
        name: 'Secunderabad North Drain',
        type: 'secondary',
        stressLevel: 'medium',
        riskIndicator: 'Moderate flow — elevated after sustained rain',
        upstreamIds: [],
        downstreamIds: ['D-103'],
        isPotentialBottleneck: false,
        isDemo: true,
      },
    },
  ],
};
