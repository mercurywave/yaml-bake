import { EditorState, SaveResult } from './types';
import { specEditorService } from './specEditorService';
import { recordEditorService } from './recordEditorService';
import { parseYaml, stringifyYaml } from './yamlUtils';

export class EditorService {
  async loadEditorData(state: EditorState) {
    if (state.mode === 'spec') {
      return specEditorService.loadEditorData(state);
    } else {
      return recordEditorService.loadEditorData(state);
    }
  }

  async trySaveEditorData(state: EditorState, content: string): Promise<SaveResult> {
    if (state.mode === 'spec') {
      return specEditorService.trySaveEditorData(state, content);
    } else {
      return recordEditorService.trySaveEditorData(state, content);
    }
  }

  async createNewRecord(databaseName: string): Promise<void> {
    return recordEditorService.createNewRecord(databaseName);
  }

  async deleteRecord(databaseName: string, recordId: string): Promise<void> {
    return recordEditorService.deleteRecord(databaseName, recordId);
  }

  async getValidationErrors(content: string, state: EditorState) {
    if (state.mode === 'spec') {
      return specEditorService.getValidationErrors(content, state);
    } else {
      return recordEditorService.getValidationErrors(content, state);
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

export const editorService = new EditorService();