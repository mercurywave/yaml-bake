# YAML Bake - Design & Todo List

## Project Overview
A single-page static web application for editing hierarchical, typed, structured databases represented as YAML files. Users select a folder containing database files, with `spec.yaml` defining the schema and individual YAML files storing records.

## Architecture

### Core Components
1. **Type System** (`src/types.ts`)
   - `FieldType`: string, number, boolean, date, array, object, enum, reference
   - `FieldDef`: Field definition with type, options, validation rules
   - `DatabaseDef`: Database schema with name and fields
   - `Spec`: Root specification containing all databases
   - `Record`: Individual data record with id and field values

2. **File System Service** (`src/fileSystem.ts`)
   - `selectFolder()`: Use `showDirectoryPicker` API to select database folder
   - `loadSpec()`: Load and cache spec.yaml
   - `loadDatabase()`: Load records for a database
   - `saveSpec()`: Save spec changes
   - `saveDatabase()`: Save record changes
   - `createDatabase()`: Create new database with schema
   - `deleteDatabase()`: Remove database
   - `createNewRecord()`: Generate new record with defaults
   - `deleteRecord()`: Remove record
   - `updateRecord()`: Update existing record

3. **YAML Utilities** (`src/yamlUtils.ts`)
   - `validateSpec()`: Validate spec structure and field definitions
   - `validateRecord()`: Validate record against database schema
   - `isValidType()`: Type checking helper

4. **Editor Service** (`src/editorService.ts`)
   - `loadEditorData()`: Load data for current editor state
   - `saveEditorData()`: Save and validate editor content
   - `getValidationErrors()`: Get validation errors for content
   - `formatContent()`: Format YAML content
   - CRUD operations for databases and records

5. **UI Components** (`src/App.tsx`)
   - Sidebar: Database navigation pane
   - Main Content: YAML editor with validation panel
   - Toolbar: Save, format, create record/database buttons

## Current Status

### ✅ Completed
- Project structure initialized with TypeScript and React
- TypeScript types defined for spec, databases, records
- YAML validation logic implemented
- File system service with folder operations
- Basic navigation pane component
- YAML editor with validation
- Application styling (dark theme)
- Fixed critical build issues (YAML utils, type system, file system API)
- **Record List View**: Show list of records when viewing a database (not just single record)
- **Record Navigation**: Add navigation between records in a database

### ⚠️ In Progress

### ❌ Pending


#### Feature Enhancements
- [ ] **Autocomplete**: Add field name and reference ID autocomplete in editor
- [ ] **Spec Editor UI**: Create visual spec editor for defining databases and fields
- [ ] **Field Type Editor**: Visual editor for field definitions (dropdowns for type, enum options)
- [ ] **Reference Validation**: Validate reference fields point to existing records
- [ ] **Database Selection**: Allow selecting which database to view in sidebar
- [ ] **Error Highlighting**: Highlight specific lines/fields in editor where errors occur
- [ ] **Undo/Redo**: Implement undo/redo for editor changes
- [ ] **Search**: Add search functionality across records
- [ ] **Bulk Operations**: Support bulk record creation/editing
- [ ] **Export/Import**: Add export/import functionality for records

#### Testing & Polish
- [ ] Add unit tests for validation logic
- [ ] Add integration tests for file operations
- [ ] Implement proper error handling and user feedback
- [ ] Optimize performance for large databases
- [ ] Add keyboard shortcuts
- [ ] Improve mobile responsiveness

## Technical Decisions

1. **Storage**: Uses File System Access API (`showDirectoryPicker`) for user-selected folder
2. **Format**: YAML for human-readable spec and record files
3. **Validation**: Strict validation with detailed error messages
4. **State Management**: React state for UI, in-memory caching for files
5. **Theme**: Dark theme with VS Code-inspired color scheme

## Known Issues
1. Build fails due to missing YAML parse/stringify functions
2. TypeScript types for File System Access API incomplete
3. Private property access issues in file system service
4. Invalid `uuid` type used instead of proper field type

## Next Steps
1. ✅ Fix critical build issues (YAML utils, type system, file system API)
2. ✅ Verify build completes successfully
3. Implement spec editor UI for visual database definition
4. Add record list view for database navigation
5. Implement autocomplete and formatting features