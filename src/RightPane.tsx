import React, { useRef, useEffect, useCallback, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { EditorState, EditorData } from './types';
import { registerLspProviders, unregisterProviders, updateGhostText, updateFieldDefs } from './lsp';

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
  const [currentEditor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const contentRef = useRef(editorContent);
  contentRef.current = editorContent;

  const handleEditorMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    setEditor(editor);
  }, []);

  useEffect(() => {
    if (!currentEditor) return;

    if (editorState.mode === 'record' && editorData?.database) {
      registerLspProviders(currentEditor, {
        getDatabaseName: () => editorState.databaseName,
        getEditorContent: () => contentRef.current,
      });
      updateFieldDefs(editorState.databaseName || null, editorData.database.fields);
      updateGhostText(currentEditor, {
        getDatabaseName: () => editorState.databaseName,
        getEditorContent: () => contentRef.current,
      });
      // Ghost text is deferred inside updateGhostText via setTimeout
    } else {
      unregisterProviders();
      updateFieldDefs(null, null);
    }
  }, [currentEditor, editorState.databaseName, editorData, editorState.mode]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value);
      
      // Update ghost text on content change
      if (editorState.mode === 'record' && currentEditor) {
        updateGhostText(currentEditor, {
          getDatabaseName: () => editorState.databaseName,
          getEditorContent: () => value,
        });
      }
      
      if (editorData) {
        getValidationErrors(value, editorState).then(errors => {
          // This would be handled by parent component
        });
      }
    }
  }, [currentEditor, editorState, editorData, setEditorContent, getValidationErrors]);

  useEffect(() => {
    return () => {
      unregisterProviders();
      updateFieldDefs(null, null);
    };
  }, []);

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
        <div className="editor-wrapper">
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <p>Loading...</p>
            </div>
          ) : (
            <MonacoEditor
              height="100%"
              language="yaml"
              value={editorContent}
              onChange={handleEditorChange}
              theme="vs-dark"
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                renderLineHighlight: 'gutter',
                lineNumbers: 'on',
                suggest: {
                  showStatusBar: true,
                }
              }}
            />
          )}
        </div>
      
        <div className="error-panel">
          <h3>Validation</h3>
          {validationErrors.length === 0 ? (
            <p style={{ color: '#a6e3a1' }}>✓ No errors</p>
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
