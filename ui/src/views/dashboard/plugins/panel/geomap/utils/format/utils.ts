import { Geometry, GeometryCollection, LineString, Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { getCenter } from 'ol/extent';

import { Gazetteer } from '../gazetteer/gazetteer';

import { decodeGeohash } from './geohash';
import { Field, FieldType } from 'types/seriesData';
import { ArrayVector } from '../arrayVector';

export function getCenterPoint(geo: Geometry): number[] {
    if (geo instanceof Point) {
      return (geo as Point).getCoordinates();
    }
    return getCenter(geo.getExtent());
  }

export function pointFieldFromGeohash(geohash: Field<string>): Field<Point> {
  return {
    name: geohash.name ?? 'Point',
    type: FieldType.Geo,
    values: new ArrayVector<any>(
      geohash.values.toArray().map((v) => {
        const coords = decodeGeohash(v);
        if (coords) {
          return new Point(fromLonLat(coords));
        }
        return undefined;
      })
    ),
    config: hiddenTooltipField,
  };
}

export function pointFieldFromLonLat(lon: Field, lat: Field): Field<Point> {
  const buffer = new Array<Point>(lon.values.length);
  for (let i = 0; i < lon.values.length; i++) {
    const longitude = lon.values.get(i);
    const latitude = lat.values.get(i);

    // TODO: Add unit tests to thoroughly test out edge cases
    // If longitude or latitude are null, don't add them to buffer
    if (longitude === null || latitude === null) {
      continue;
    }

    buffer[i] = new Point(fromLonLat([longitude, latitude]));
  }

  return {
    name: 'Point',
    type: FieldType.Geo,
    values: new ArrayVector(buffer),
    config: hiddenTooltipField,
  };
}

export function getGeoFieldFromGazetteer(gaz: Gazetteer, field: Field<string>): Field<Geometry | undefined> {
  const count = field.values.length;
  const geo = new Array<Geometry | undefined>(count);
  for (let i = 0; i < count; i++) {
    geo[i] = gaz.find(field.values.get(i))?.geometry();
  }
  return {
    name: 'Geometry',
    type: FieldType.Geo,
    values: new ArrayVector(geo),
    config: hiddenTooltipField,
  };
}

export function createGeometryCollection(
  src: Field<Geometry | undefined>,
  dest: Field<Geometry | undefined>
): Field<Geometry | undefined> {
  const v0 = src.values;
  const v1 = dest.values;
  if (!v0 || !v1) {
    throw 'missing src/dest';
  }
  if (v0.length !== v1.length) {
    throw 'Source and destination field lengths do not match';
  }

  const count = src.values.length!;
  const geo = new Array<Geometry | undefined>(count);
  for (let i = 0; i < count; i++) {
    const a = v0[i];
    const b = v1[i];
    if (a && b) {
      geo[i] = new GeometryCollection([a, b]);
    } else if (a) {
      geo[i] = a;
    } else if (b) {
      geo[i] = b;
    }
  }
  return {
    name: 'Geometry',
    type: FieldType.Geo,
    values: new ArrayVector(geo),
    config: hiddenTooltipField,
  };
}

export function createLineBetween(
  src: Field<Geometry | undefined>,
  dest: Field<Geometry | undefined>
): Field<Geometry | undefined> {
  const v0 = src.values;
  const v1 = dest.values;
  if (!v0 || !v1) {
    throw 'missing src/dest';
  }
  if (v0.length !== v1.length) {
    throw 'Source and destination field lengths do not match';
  }

  const count = src.values.length!;
  const geo = new Array<Geometry | undefined>(count);
  for (let i = 0; i < count; i++) {
    const a = v0[i];
    const b = v1[i];
    if (a && b) {
      geo[i] = new LineString([getCenterPoint(a), getCenterPoint(b)]);
    }
  }
  return {
    name: 'Geometry',
    type: FieldType.Geo,
    values: new ArrayVector(geo),
    config: hiddenTooltipField,
  };
}

const hiddenTooltipField = Object.freeze({
  custom: {
    hideFrom: { tooltip: true },
  },
});
