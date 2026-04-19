import { Spec, Record } from './types';

let cachedSpec: Spec | null = null;
const cachedDatabases: { [key: string]: Record[] } = {};

export function setSpec(spec: Spec | null): void {
  cachedSpec = spec;
}

export function getSpec(): Spec | null {
  return cachedSpec;
}

export function setDatabases(databases: { [key: string]: Record[] }): void {
  for (const key of Object.keys(cachedDatabases)) {
    delete cachedDatabases[key];
  }
  for (const [key, value] of Object.entries(databases)) {
    cachedDatabases[key] = value;
  }
}

export function getDatabases(): { [key: string]: Record[] } {
  return cachedDatabases;
}

export function getRecords(databaseName: string): Record[] {
  return cachedDatabases[databaseName] || [];
}
