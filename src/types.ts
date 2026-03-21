export type FieldType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'enum'
  | 'reference'
  | 'uuid';

export interface FieldDef {
  name: string;
  type: FieldType;
  optional?: boolean;
  items?: FieldDef;
  fields?: FieldDef[];
  options?: string[];
  target?: string;
  description?: string;
  default?: any;
}

export interface DatabaseDef {
  name: string;
  fields: FieldDef[];
  description?: string;
}

export interface Spec {
  databases: DatabaseDef[];
  version?: string;
  description?: string;
}

export interface Record {
  [key: string]: any;
  id?: string;
}

export type EditorMode = 'spec' | 'record';

export interface EditorState {
  mode: EditorMode;
  databaseName?: string;
  recordId?: string;
}