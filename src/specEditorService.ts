import { Spec, DatabaseDef, Record, EditorState, SaveResult } from './types';
import { fileSystem } from './fileSystem';
import { parseYaml, stringifyYaml } from './utils';
import { validateSpec } from './specValidator';
import { makeSaveSuccess, makeSaveError, makeSaveErrors } from './utils';

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

export class SpecEditorService {
  async loadEditorData(state: EditorState): Promise<EditorData> {
    const spec = await fileSystem.loadSpec();
    
    // For spec editing, we show the raw spec without UUIDs
    const specErrors = validateSpec(spec).map(msg => ({
      message: msg,
      severity: 'error' as const
    }));
    
    return {
      content: spec.rawSpec,
      spec,
      validationErrors: specErrors
    };
  }

  async trySaveEditorData(state: EditorState, content: string): Promise<SaveResult> {
    try {
      const data = parseYaml(content);
      
      const errors = validateSpec(data);
      if (errors.length > 0) {
        return makeSaveErrors(errors);
      }
      
      await fileSystem.saveSpec(content);
      return makeSaveSuccess();
    } catch (error) {
      return makeSaveError(`Save error: ${(error as Error).message}`);
    }
  }

  async forceSaveEditorData(state: EditorState, content: string): Promise<SaveResult> {
    try {
      await fileSystem.saveSpec(content);
      return makeSaveSuccess();
    } catch (error) {
      return makeSaveError(`Save error: ${(error as Error).message}`);
    }
  }

  async getValidationErrors(content: string, state: EditorState): Promise<ValidationError[]> {
    try {
      const data = parseYaml(content);
      
      const errors = validateSpec(data).map(msg => ({
        message: msg,
        severity: 'error' as const
      }));
      return errors;
    } catch {
      return [{
        message: 'Invalid JSON/YAML syntax',
        severity: 'error' as const
      }];
    }
  }
}

export const specEditorService = new SpecEditorService();