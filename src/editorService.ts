import { EditorState, SaveResult } from './types';
import { specEditorService } from './specEditorService';
import { recordEditorService } from './recordEditorService';
import { parseYaml, stringifyYaml } from './utils';
import { makeSaveSuccess, makeSaveError, makeSaveErrors, makeSaveNoChange } from './utils';

export class EditorService {
  private lastSavedContent: Map<string, string> = new Map();

  async loadEditorData(state: EditorState) {
    let editorData;
    if (state.mode === 'spec') {
      editorData = await specEditorService.loadEditorData(state);
    } else {
      editorData = await recordEditorService.loadEditorData(state);
    }
    
    // Set last saved content to current content after loading
    const key = this.getEditorKey(state);
    this.lastSavedContent.set(key, editorData.content);
    
    return editorData;
  }

  async trySaveEditorData(state: EditorState, content: string): Promise<SaveResult> {
    // Generate a unique key for this editor state
    const key = this.getEditorKey(state);
    
    // Only save if content has changed since last save
    const lastSaved = this.lastSavedContent.get(key);
    if (lastSaved === content) {
      return makeSaveNoChange();
    }
    
    if (state.mode === 'spec') {
      const result = await specEditorService.trySaveEditorData(state, content);
      if (result.success) {
        this.lastSavedContent.set(key, content);
      }
      return result;
    } else {
      const result = await recordEditorService.trySaveEditorData(state, content);
      if (result.success) {
        this.lastSavedContent.set(key, content);
      }
      return result;
    }
  }
  
  async forceSaveEditorData(state: EditorState, content: string): Promise<SaveResult> {
    const key = this.getEditorKey(state);
    if (state.mode === 'spec') {
      const result = await specEditorService.forceSaveEditorData(state, content);
      if (result.success) {
        this.lastSavedContent.set(key, content);
      }
      return result;
    } else {
      const result = await recordEditorService.trySaveEditorData(state, content, true);
      if (result.success) {
        this.lastSavedContent.set(key, content);
      }
      return result;
    }
  }
  
  private getEditorKey(state: EditorState): string {
    if (state.mode === 'spec') {
      return 'spec';
    } else {
      return `${state.databaseName}-${state.recordId || 'all'}`;
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