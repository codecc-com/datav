import { getCenter } from 'ol/extent';
import { Geometry, Point } from 'ol/geom';


import { frameFromGeoJSON } from '../format/geojson';
import { pointFieldFromLonLat, pointFieldFromGeohash } from '../format/utils';

import { loadWorldmapPoints } from './worldmap';
import { Field, FieldType, SeriesData } from 'types/seriesData';
import { requestApi } from 'utils/axios/request';

export type KeyValue<T = any> = Record<string, T>;
export interface PlacenameInfo {
  point: () => Point | undefined; // lon, lat (WGS84)
  geometry: () => Geometry | undefined;
  frame?: SeriesData;
  index?: number;
}

export interface Gazetteer {
  path: string;
  error?: string;
  find: (key: string) => PlacenameInfo | undefined;
  examples: (count: number) => string[];
  frame?: () => SeriesData;
  count?: number;
}

// Without knowing the datatype pick a good lookup function
export function loadGazetteer(path: string, data: any): Gazetteer {
  // try loading geojson
  let frame: SeriesData | undefined = undefined;

  if (Array.isArray(data)) {
    const first = data[0] as any;
    // Check for legacy worldmap syntax
    if (first.latitude && first.longitude && (first.key || first.keys)) {
      return loadWorldmapPoints(path, data);
    }
  } else {
    if (Array.isArray(data?.features) && data?.type === 'FeatureCollection') {
      frame = frameFromGeoJSON(data);
    }
  }

  if (!frame) {
    try {
      frame = toDataFrame(data);
    } catch (ex) {
      return {
        path,
        error: `${ex}`,
        find: (k) => undefined,
        examples: (v) => [],
      };
    }
  }

  return frameAsGazetter(frame, { path });
}

export function frameAsGazetter(frame: SeriesData, opts: { path: string; keys?: string[] }): Gazetteer {
  const keys: Field[] = [];
  let geo: Field<Geometry> | undefined = undefined;
  let lat: Field | undefined = undefined;
  let lng: Field | undefined = undefined;
  let geohash: Field | undefined = undefined;
  let firstString: Field | undefined = undefined;
  for (const f of frame.fields) {
    if (f.type === FieldType.Geo) {
      geo = f;
    }
    if (!firstString && f.type === FieldType.String) {
      firstString = f;
    }
    if (f.name) {
      if (opts.keys && opts.keys.includes(f.name)) {
        keys.push(f);
      }

      const name = f.name.toUpperCase();
      switch (name) {
        case 'LAT':
        case 'LATITUTE':
          lat = f;
          break;

        case 'LON':
        case 'LNG':
        case 'LONG':
        case 'LONGITUE':
          lng = f;
          break;

        case 'GEOHASH':
          geohash = f;
          break;

        case 'ID':
        case 'UID':
        case 'KEY':
        case 'CODE':
          if (!opts.keys) {
            keys.push(f);
          }
          break;

        default: {
          if (!opts.keys) {
            if (name.endsWith('_ID') || name.endsWith('_CODE')) {
              keys.push(f);
            }
          }
        }
      }
    }
  }

  // Use the first string field
  if (!keys.length && firstString) {
    keys.push(firstString);
  }

  let isPoint = false;

  // Create a geo field from lat+lng
  if (!geo) {
    if (geohash) {
      geo = pointFieldFromGeohash(geohash);
      isPoint = true;
    } else if (lat && lng) {
      geo = pointFieldFromLonLat(lng, lat);
      isPoint = true;
    }
  } else {
    isPoint = geo.values.get(0).getType() === 'Point';
  }

  const lookup = new Map<string, number>();
  keys.forEach((f) => {
    f.values.forEach((k, idx) => {
      const str = `${k}`;
      lookup.set(str.toUpperCase(), idx);
      lookup.set(str, idx);
    });
  });

  return {
    path: opts.path,
    find: (k) => {
      const index = lookup.get(k);
      if (index != null) {
        const g = geo?.values.get(index);
        return {
          frame,
          index,
          point: () => {
            if (!g || isPoint) {
              return g as Point;
            }
            return new Point(getCenter(g.getExtent()));
          },
          geometry: () => g,
        };
      }
      return undefined;
    },
    examples: (v) => {
      const ex: string[] = [];
      for (let k of lookup.keys()) {
        ex.push(k);
        if (ex.length > v) {
          break;
        }
      }
      return ex;
    },
    frame: () => frame,
    count: frame.length,
  };
}

const registry: KeyValue<Gazetteer> = {};

export const COUNTRIES_GAZETTEER_PATH = 'public/gazetteer/countries.json';

/**
 * Given a path to a file return a cached lookup function
 */
export async function getGazetteer(path?: string): Promise<Gazetteer> {
  // When not specified, use the default path
  if (!path) {
    path = COUNTRIES_GAZETTEER_PATH;
  }

  let lookup = registry[path];
  if (!lookup) {
    try {
      // block the async function
      const data = await requestApi.get(path!);
      lookup = loadGazetteer(path, data);
    } catch (err) {
      console.warn('Error loading placename lookup', path, err);
      lookup = {
        path,
        error: 'Error loading URL',
        find: (k) => undefined,
        examples: (v) => [],
      };
    }
    registry[path] = lookup;
  }
  return lookup;
}
