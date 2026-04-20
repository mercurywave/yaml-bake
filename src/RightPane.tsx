import React, { useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';
import { EditorState, EditorData } from './types';
import { registerCompletionProviders, registerGhostText, unregisterProviders, updateGhostText, updateFieldDefs } from './lsp';

interface RightPaneProps {
  editorState: EditorState;
  editorContent: string;
  validationErrors: any[];
  selectedDatabase: string | null;
  selectedRecordId: string | null;
  isLoading: boolean;
  handleFormat: () => void;
  handleSave: () => void;
  handleCreateRecord: () => void;
  handleDeleteRecord: (recordId: string) => void;
  setEditorContent: (content: string) => void;
  editorData: EditorData | null;
  getValidationErrors: (content: string, state: any) => Promise<any[]>;
}

const RightPane: React.FC<RightPaneProps> = ({
  editorState,
  editorContent,
  validationErrors,
  selectedDatabase,
  selectedRecordId,
  isLoading,
  handleFormat,
  handleSave,
  handleCreateRecord,
  handleDeleteRecord,
  setEditorContent,
  editorData,
  getValidationErrors
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);
  const contentRef = useRef(editorContent);
  contentRef.current = editorContent;

  // Create editor once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const model = monaco.editor.createModel(
      contentRef.current,
      'yaml'
    );
    modelRef.current = model;

    const editor = monaco.editor.create(containerRef.current, {
      model,
      theme: 'vs-dark',
      minimap: { enabled: true },
      fontSize: 14,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      renderLineHighlight: 'gutter',
      lineNumbers: 'on',
      suggest: {
        showStatusBar: true,
      },
      snippetSuggestions: 'none',
      wordBasedSuggestions: 'off',
    });

    editorRef.current = editor;

    // Listen for content changes from the user
    const listener = editor.onDidChangeModelContent(() => {
      const value = model.getValue();
      contentRef.current = value;
      setEditorContent(value);
    });

    // Register LSP providers and ghost text once
    registerCompletionProviders();
    registerGhostText(editor, {
      getDatabaseName: () => editorState.databaseName || undefined,
      getEditorContent: () => contentRef.current,
    });

    return () => {
      listener.dispose();
      editorRef.current = null;
      editor.dispose();
      modelRef.current = null;
      model.dispose();
      unregisterProviders();
      updateFieldDefs(null, null);
    };
  }, []);

  // Sync external content changes into the model
  useEffect(() => {
    if (modelRef.current && editorContent !== modelRef.current.getValue()) {
      modelRef.current.setValue(editorContent);
    }
  }, [editorContent]);

  // Update field defs and ghost text when database changes
  useEffect(() => {
    if (!editorRef.current) return;

    if (editorState.mode === 'record' && editorData?.database) {
      updateFieldDefs(editorState.databaseName || null, editorData.database.fields);
    } else {
      updateFieldDefs(null, null);
    }
    updateGhostText(editorRef.current, {
      getDatabaseName: () => editorState.databaseName || undefined,
      getEditorContent: () => contentRef.current,
    });
  }, [editorState.databaseName, editorData, editorState.mode]);

  return (
    <div className="right-pane">
      <div className="toolbar">
        <h2>
          {editorState.displayName}
        </h2>
        
        <div className="toolbar-actions">
          <button 
            className="btn btn-secondary" 
            onClick={handleFormat}
            disabled={!editorState.mode}
          >
            Format
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={!editorState.mode}
          >
            Save
          </button>
          {selectedDatabase && !selectedRecordId && (
            <button 
              className="btn btn-secondary"
              onClick={handleCreateRecord}
            >
              + New Record
            </button>
          )}
          {selectedRecordId && (
            <button 
              className="btn btn-danger"
              onClick={() => handleDeleteRecord(selectedRecordId)}
            >
              Delete
            </button>
          )}
        </div>
      </div>
      
      <div className="editor-container">
        <div className={`editor-wrapper ${isLoading ? 'loading' : ''}`}>
          <div ref={containerRef} className="monaco-container" />
        </div>
        {isLoading && (
          <div className="loading-overlay">
            <p>Loading...</p>
          </div>
        )}
      
        <div className="error-panel">
          <h3>Validation</h3>
          {validationErrors.length === 0 ? (
            <p className="no-errors">✓ No errors</p>
          ) : (
            <ul className="error-list">
              {validationErrors.map((err, idx) => (
                <li key={idx} className={`error-item ${err.severity}`}>
                  {err.severity === 'error' ? '✗' : '⚠'} {err.message}{err.line ? ` (line ${err.line})` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default RightPane;
