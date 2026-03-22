import React, { useState, useEffect } from 'react';
import { Spec, DatabaseDef, FieldDef } from './types';

interface DatabaseEditorProps {
  database: DatabaseDef;
  onSave: (db: DatabaseDef) => void;
  onDelete: () => void;
}

const DatabaseEditor: React.FC<DatabaseEditorProps> = ({ database, onSave, onDelete }) => {
  const [name, setName] = useState(database.name);
  const [fields, setFields] = useState<FieldDef[]>(database.fields || []);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('string');
  const [newFieldOptional, setNewFieldOptional] = useState(false);

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    
    const newField: FieldDef = {
      name: newFieldName.trim(),
      type: newFieldType as any,
      optional: newFieldOptional
    };
    
    setFields([...fields, newField]);
    setNewFieldName('');
  };

  const handleRemoveField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
  };

  const handleSave = () => {
    onSave({
      name,
      fields
    });
  };

  return (
    <div className="database-editor">
      <div className="database-header">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="database-name-input"
          placeholder="Database name"
        />
        <button className="btn btn-danger" onClick={onDelete}>Delete</button>
      </div>
      
      <div className="field-editor">
        <h3>Fields</h3>
        <div className="field-inputs">
          <input
            type="text"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            placeholder="Field name"
          />
          <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)}>
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="date">Date</option>
            <option value="array">Array</option>
            <option value="object">Object</option>
            <option value="enum">Enum</option>
            <option value="reference">Reference</option>
          </select>
          <label>
            <input
              type="checkbox"
              checked={newFieldOptional}
              onChange={(e) => setNewFieldOptional(e.target.checked)}
            />
            Optional
          </label>
          <button className="btn btn-secondary" onClick={handleAddField}>Add Field</button>
        </div>
        
        <div className="field-list">
          {fields.map((field, index) => (
            <div key={index} className="field-item">
              <span className="field-name">{field.name}</span>
              <span className="field-type">{field.type}</span>
              <span className="field-optional">{field.optional ? 'optional' : 'required'}</span>
              <button className="btn btn-small" onClick={() => handleRemoveField(index)}>Remove</button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="editor-actions">
        <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
      </div>
    </div>
  );
};

interface SpecEditorProps {
  spec: Spec;
  onSave: (spec: Spec) => void;
}

const SpecEditor: React.FC<SpecEditorProps> = ({ spec, onSave }) => {
  const [databases, setDatabases] = useState<DatabaseDef[]>([]);
  const [newDatabaseName, setNewDatabaseName] = useState('');
  const [editingDatabase, setEditingDatabase] = useState<DatabaseDef | null>(null);

  // Ensure databases is always an array
  useEffect(() => {
    if (spec && spec.databases && Array.isArray(spec.databases)) {
      setDatabases(spec.databases);
    } else {
      setDatabases([]);
    }
  }, [spec]);

  const handleAddDatabase = () => {
    if (!newDatabaseName.trim()) return;
    
    const newDatabase: DatabaseDef = {
      name: newDatabaseName.trim(),
      fields: []
    };
    
    setDatabases([...databases, newDatabase]);
    setNewDatabaseName('');
  };

  const handleSaveDatabase = (updatedDatabase: DatabaseDef) => {
    const updatedDatabases = databases.map(db => 
      db.name === updatedDatabase.name ? updatedDatabase : db
    );
    setDatabases(updatedDatabases);
    setEditingDatabase(null);
  };

  const handleDeleteDatabase = (name: string) => {
    const updatedDatabases = databases.filter(db => db.name !== name);
    setDatabases(updatedDatabases);
    if (editingDatabase?.name === name) {
      setEditingDatabase(null);
    }
  };

  const handleSaveSpec = () => {
    onSave({
      databases
    });
  };

  // Handle case where spec might not be valid
  if (!spec) {
    return <div className="spec-editor">Error: Invalid spec data</div>;
  }

  return (
    <div className="spec-editor">
      <h2>Database Schema</h2>
      
      <div className="database-creation">
        <h3>Add New Database</h3>
        <div className="input-group">
          <input
            type="text"
            value={newDatabaseName}
            onChange={(e) => setNewDatabaseName(e.target.value)}
            placeholder="Database name"
          />
          <button className="btn btn-primary" onClick={handleAddDatabase}>Create Database</button>
        </div>
      </div>
      
      <div className="databases-list">
        <h3>Databases</h3>
        {databases && databases.map((db) => (
          <div key={db.name} className="database-item">
            {editingDatabase?.name === db.name ? (
              <DatabaseEditor 
                database={db} 
                onSave={handleSaveDatabase} 
                onDelete={() => handleDeleteDatabase(db.name)} 
              />
            ) : (
              <div className="database-view">
                <span className="database-name">{db.name}</span>
                <span className="field-count">{(db.fields || []).length} fields</span>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setEditingDatabase(db)}
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="editor-actions">
        <button className="btn btn-primary" onClick={handleSaveSpec}>Save Schema</button>
      </div>
    </div>
  );
};

export default SpecEditor;