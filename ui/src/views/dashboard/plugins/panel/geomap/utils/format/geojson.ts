import GeoJSON from 'ol/format/GeoJSON';
import { Geometry } from 'ol/geom';
import { Field, FieldType, SeriesData } from 'types/seriesData';
import { ArrayVector } from '../arrayVector';
import { isBoolean, isNumber, isString } from 'lodash';
import { isDateTime } from 'components/DatePicker/TimePicker';


interface FieldInfo {
  values: any[];
  types: Set<FieldType>;
  count: number;
}

// http://geojson.xyz/

export function getFieldTypeFromValue(v: unknown): FieldType {
    if (v instanceof Date || isDateTime(v)) {
      return FieldType.Time;
    }
  
    if (isNumber(v)) {
      return FieldType.Number;
    }
  
    if (isString(v)) {
      return FieldType.String;
    }
  
    if (isBoolean(v)) {
      return FieldType.Boolean;
    }
  
    return FieldType.Other;
  }


export function frameFromGeoJSON(body: Document | Element | Object | string): SeriesData {
  const data = new GeoJSON().readFeatures(body, { featureProjection: 'EPSG:3857' });
  const length = data.length;

  const geo: Geometry[] = new Array(length).fill(null);

  const fieldOrder: string[] = [];
  const lookup = new Map<string, FieldInfo>();
  const getField = (name: string) => {
    let f = lookup.get(name);
    if (!f) {
      f = {
        types: new Set<FieldType>(),
        values: new Array(length).fill(null),
        count: 0,
      };
      fieldOrder.push(name);
      lookup.set(name, f);
    }
    return f;
  };
  const getBestName = (...names: string[]) => {
    for (const k of names) {
      if (!lookup.has(k)) {
        return k;
      }
    }
    return '___' + names[0];
  };

  const idfield: FieldInfo = {
    types: new Set<FieldType>(),
    values: new Array(length).fill(null),
    count: 0,
  };
  for (let i = 0; i < length; i++) {
    const feature = data[i];
    geo[i] = feature.getGeometry()!;

    const id = feature.getId();
    if (id != null) {
      idfield.values[i] = id;
      idfield.types.add(getFieldTypeFromValue(id));
      idfield.count++;
    }

    for (const key of feature.getKeys()) {
      const val = feature.get(key);
      if (val === geo[i] || val == null) {
        continue;
      }
      const field = getField(key);
      field.values[i] = val;
      field.types.add(getFieldTypeFromValue(val));
      field.count++;
    }
  }

  const fields: Field[] = [];
  if (idfield.count > 0) {
    const type = ensureSingleType(idfield);
    fields.push({
      name: getBestName('id', '_id', '__id'),
      type,
      values: new ArrayVector(idfield.values),
      config: {},
    });
  }

  // Add a geometry field
  fields.push({
    name: getBestName('geo', 'geometry'),
    type: FieldType.Geo,
    values: new ArrayVector(geo),
    config: {},
  });

  for (const name of fieldOrder) {
    const info = lookup.get(name);
    if (!info) {
      continue;
    }
    const type = ensureSingleType(info);
    fields.push({
      name,
      type,
      values: new ArrayVector(info.values),
      config: {},
    });
  }

  // Simple frame
  return {
    fields,
    length,
  };
}

function ensureSingleType(info: FieldInfo): FieldType {
  if (info.count < 1) {
    return FieldType.Other;
  }
  if (info.types.size > 1) {
    info.values = info.values.map((v) => {
      if (v != null) {
        return `${v}`;
      }
      return v;
    });
    return FieldType.String;
  }
  return info.types.values().next().value;
}
