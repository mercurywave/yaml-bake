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
  type: FieldType;
  required: boolean;
  unique?: boolean;
  items?: FieldDef;
  fields?: { [key: string]: FieldDef };
  options?: string[];
  target?: string;
  description?: string;
  default?: any;
}

export interface DatabaseDef {
  fields: { [key: string]: FieldDef };
  description?: string;
}

export interface Spec {
  databases: { [key: string]: DatabaseDef };
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