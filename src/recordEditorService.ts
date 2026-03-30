import { Spec, DatabaseDef, Record, EditorState } from './types';
import { fileSystem } from './fileSystem';
import { parseYaml, stringifyYaml, validateSpec, validateRecord } from './yamlUtils';

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

export class RecordEditorService {
  async loadEditorData(state: EditorState): Promise<EditorData> {
    const spec = await fileSystem.loadSpec();
    
    if (!state.databaseName) {
      throw new Error('Database name required for record editing');
    }

    const database = spec.databases[state.databaseName];
    if (!database) {
      throw new Error(`Database "${state.databaseName}" not found`);
    }

    const records = await fileSystem.loadDatabase(state.databaseName);
    
    if (state.recordId) {
      const record = records.find(r => r.id === state.recordId);
      if (!record) {
        throw new Error(`Record "${state.recordId}" not found`);
      }
      
      const recordErrors = validateRecord(spec, record, spec.databases[state.databaseName]).map(msg => ({
        message: msg,
        severity: 'error' as const
      }));
      
      return {
        content: stringifyYaml(record),
        spec,
        database,
        record,
        validationErrors: recordErrors
      };
    } else {
      const recordsYaml = stringifyYaml(records);
      const allErrors: ValidationError[] = [];
      
      records.forEach((record, index) => {
        const errors = validateRecord(spec, record, spec.databases[state.databaseName!]);
        errors.forEach(msg => {
          allErrors.push({
            message: `Record at index ${index}: ${msg}`,
            severity: 'error' as const
          });
        });
      });
      
      return {
        content: recordsYaml,
        spec,
        database,
        validationErrors: allErrors
      };
    }
  }

  async saveEditorData(state: EditorState, content: string): Promise<void> {
    try {
      const data = parseYaml(content);
      
      if (!state.databaseName) {
        throw new Error('Database name required for record editing');
      }
      
      if (state.recordId) {
        const spec = await fileSystem.loadSpec();
        const database = spec.databases[state.databaseName];
        if (!database) {
          throw new Error(`Database "${state.databaseName}" not found`);
        }
        
        const errors = validateRecord(spec, data, database);
        if (errors.length > 0) {
          throw new Error(`Invalid record: ${errors.join(', ')}`);
        }
        
        await fileSystem.updateRecord(state.databaseName, data);
      } else {
        const spec = await fileSystem.loadSpec();
        const database = spec.databases[state.databaseName];
        if (!database) {
          throw new Error(`Database "${state.databaseName}" not found`);
        }
        
        if (!Array.isArray(data)) {
          throw new Error('Records must be an array');
        }
        
        data.forEach((record: Record, index: number) => {
          const errors = validateRecord(spec, record, database);
          if (errors.length > 0) {
            throw new Error(`Record at index ${index} is invalid: ${errors.join(', ')}`);
          }
        });
        
        await fileSystem.saveDatabase(state.databaseName, data);
      }
    } catch (error) {
      throw new Error(`Save error: ${(error as Error).message}`);
    }
  }

  async createNewRecord(databaseName: string): Promise<void> {
    await fileSystem.createNewRecord(databaseName);
  }

  async deleteRecord(databaseName: string, recordId: string): Promise<void> {
    await fileSystem.deleteRecord(databaseName, recordId);
  }

  async getValidationErrors(content: string, state: EditorState): Promise<ValidationError[]> {
    try {
      const data = parseYaml(content);
      
      if (!state.databaseName || !state.recordId) {
        return [];
      }
      
      const spec = await fileSystem.loadSpec();
      const database = spec.databases[state.databaseName];
      if (database) {
        const errors = validateRecord(spec, data, database).map(msg => ({
          message: msg,
          severity: 'error' as const
        }));
        return errors;
      }
      
      return [];
    } catch {
      return [{
        message: 'Invalid JSON/YAML syntax',
        severity: 'error' as const
      }];
    }
  }

  formatContent(content: string): string {
    try {
      const data = parseYaml(content);
      return stringifyYaml(data);
    } catch {
      return content;
    }
  }
}

export const recordEditorService = new RecordEditorService();