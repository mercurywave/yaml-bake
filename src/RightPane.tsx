import React from 'react';
import MonacoEditor from '@monaco-editor/react';
import { EditorState } from './types';
import { EditorData } from './editorService';

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
              onChange={(value) => {
                if (value !== undefined) {
                  setEditorContent(value);
                  if (editorData) {
                    getValidationErrors(value, editorState).then(errors => {
                      // This would be handled by parent component
                    });
                  }
                }
              }}
              theme="vs-dark"
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