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
  typeDef?: string;
}

export interface DatabaseDef {
  fields: { [key: string]: FieldDef };
  description?: string;
  display?: string;
}

export interface Spec {
  databases: { [key: string]: DatabaseDef };
  types: { [key: string]: FieldDef };
  rawSpec: string;
}

export interface Record {
  [key: string]: any;
  id?: string;
}

export type EditorMode = 'spec' | 'record';

export interface EditorState {
  mode: EditorMode;
  displayName: string;
  databaseName?: string;
  recordId?: string;
}

export interface ValidationError {
  message: string;
  severity: 'error' | 'warning';
  field?: string;
  line?: number;
}

export interface EditorData {
  content: string;
  spec?: Spec;
  database?: DatabaseDef;
  record?: Record;
  validationErrors: ValidationError[];
}

export interface SaveResult {
  success: boolean;
  errors: ValidationError[];
  noChange?: boolean;
}