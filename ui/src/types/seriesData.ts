// Copyright 2023 Datav.io Team
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
export interface SeriesData {
    id: number;
    name?: string;
    fields: Field[]; // All fields of equal length

    // The number of rows
    length?: number;

    // series color showing in graph
    color?: string 

    rawName?: string // used for name override
}

export enum FieldType {
    Time = 'time', // or date
    Number = 'number',
    String = 'string',
    Boolean = 'boolean',
    // Used to detect that the value is some kind of trace data to help with the visualisation and processing.
    Trace = 'trace',
    Other = 'other', // Object, Array, etc
    Geo = "geo"
}

export interface Field<T = any, V = Vector<T>> {
    /**
     * Name of the field (column)
     */
    name: string;
    /**
     *  Field value type (string, number, etc)
     */
    type: FieldType;
    values: any[]; // The raw field values
    labels?: {[key: string]: string};
}


export interface Vector<T = any> {
    length: number;

    /**
     * Access the value by index (Like an array)
     */
    get(index: number): T;

    /**
     * Get the resutls as an array.
     */
    toArray(): T[];
}

/**
 * Apache arrow vectors are Read/Write
 */
export interface ReadWriteVector<T = any> extends Vector<T> {
    set: (index: number, value: T) => void;
}

/**
 * Vector with standard manipulation functions
 */
export interface MutableVector<T = any> extends ReadWriteVector<T> {
    /**
     * Adds the value to the vector
     */
    add: (value: T) => void;

    /**
     * modifies the vector so it is now the opposite order
     */
    reverse: () => void;
}







