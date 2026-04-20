import * as monaco from 'monaco-editor';
import { Spec, Record, FieldDef } from './types';
import { generateDisplayName } from './dataValidator';
import { getSpec, getRecords } from './global';

// Monaco top-level types
type IPosition = monaco.IPosition;

interface LspCallbacks {
  getDatabaseName: () => string | undefined;
  getEditorContent: () => string;
}

interface Disposable {
  dispose: () => void;
}

const disposables: Set<Disposable> = new Set();

// Track field definitions for the current database (resolved from spec)
let currentFieldDefs: { [key: string]: FieldDef } | null = null;
let currentDatabaseName: string | null = null;
let ghostDecorationCollection: monaco.editor.IEditorDecorationsCollection | null = null;

// Track whether completion providers have been registered (once per page lifecycle)
let completionProvidersRegistered = false;

/**
 * Resolve a field type alias from the spec's custom types.
 */
function resolveTypeAlias(field: FieldDef, spec: Spec): FieldDef {
  if (field.type && spec.types && spec.types[field.type]) {
    return { ...spec.types[field.type]! };
  }
  return { ...field };
}

/**
 * Check if a field definition represents a reference type.
 */
function isReferenceField(field: FieldDef): boolean {
  const resolved = resolveTypeAlias(field, { types: {} } as any);
  return resolved.type === 'reference';
}

/**
 * Get the target database name for a reference field.
 */
function getReferenceTarget(field: FieldDef): string | undefined {
  const resolved = resolveTypeAlias(field, { types: {} } as any);
  return resolved.target;
}

/**
 * Parse a YAML line to extract the field key and value.
 * Returns { key, value, indent } or null if not a key-value line.
 */
function parseYamlKeyValueLine(line: string): { key: string; value: string; indent: number } | null {
  const trimmed = line.trimStart();
  const indent = line.length - trimmed.length;

  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---') || trimmed.startsWith('...')) {
    return null;
  }

  // Match YAML key: value pattern (key at current indentation level)
  const match = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
  if (!match) {
    return null;
  }

  const key = match[1];
  const value = match[2].trim();

  // Skip if the value looks like a YAML collection indicator
  if (value === '' || value === '|' || value === '>' || value === '{' || value === '[') {
    return { key, value: '', indent };
  }

  return { key, value, indent };
}

/**
 * Find the nearest parent field definition for a given key and indent level.
 * Walks up through the field hierarchy.
 */
function findFieldForKey(
  key: string,
  indent: number,
  fields: { [key: string]: FieldDef },
  spec: Spec
): FieldDef | undefined {
  // Direct match at current level
  if (fields[key]) {
    return resolveTypeAlias(fields[key], spec);
  }

  // Check nested objects
  for (const fieldName in fields) {
    const field = fields[fieldName];
    const resolved = resolveTypeAlias(field, spec);

    if (resolved.type === 'object' && resolved.fields) {
      const nested = findFieldForKey(key, indent, resolved.fields, spec);
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
}

/**
 * Register completion providers at the language level (once per page lifecycle).
 */
export function registerCompletionProviders(): void {
  if (completionProvidersRegistered) return;
  completionProvidersRegistered = true;

  registerFieldCompletionProvider();
  registerReferenceCompletionProvider();
}

/**
 * Register ghost text decorations for a specific editor instance.
 * This should be called every time the editor remounts.
 */
export function registerGhostText(
  editor: monaco.editor.IStandaloneCodeEditor,
  callbacks: LspCallbacks
): void {
  ghostDecorationCollection = editor.createDecorationsCollection();
  updateGhostText(editor, callbacks);
}

/**
 * Unregister ghost text decorations and clean up editor-specific state.
 */
export function unregisterProviders(): void {
  // Dispose all registered providers
  for (const disposable of disposables) {
    disposable.dispose();
  }
  disposables.clear();

  // Clear ghost decorations
  if (ghostDecorationCollection) {
    ghostDecorationCollection.clear();
    ghostDecorationCollection = null;
  }

  currentFieldDefs = null;
  currentDatabaseName = null;
}

/**
 * Register the field name completion provider.
 * Suggests field names from the database spec when editing YAML keys.
 */
function registerFieldCompletionProvider(): void {
  const provider = monaco.languages.registerCompletionItemProvider('yaml', {

    provideCompletionItems(model, position, _context, _token) {
      const lineText = model.getLineContent(position.lineNumber);
      const parsed = parseYamlKeyValueLine(lineText);

      if (!parsed) {
        return { suggestions: [] };
      }

      // Only provide completions if we have field definitions loaded
      if (!currentFieldDefs) {
        return { suggestions: [] };
      }

      // If there's already a key and value, don't suggest field names
      if (parsed.key && parsed.value) {
        return { suggestions: [] };
      }

      // If the key already matches a defined field with a value, don't suggest
      if (parsed.key && currentFieldDefs[parsed.key] && parsed.value) {
        return { suggestions: [] };
      }

      // Check if we're inside a nested object by looking at previous lines
      const lines = model.getLinesContent();
      const prevIndent = findParentObjectIndent(lines, position.lineNumber - 1, parsed.indent);

      let fieldsToSuggest = currentFieldDefs;

      if (prevIndent !== null) {
        // We're inside a nested object - find its field definition
        for (let i = position.lineNumber - 2; i >= 0; i--) {
          const line = lines[i];
          const p = parseYamlKeyValueLine(line);
          if (p && p.indent === prevIndent && currentFieldDefs && currentFieldDefs[p.key]) {
            const field = currentFieldDefs[p.key];
            if (field.fields) {
              fieldsToSuggest = field.fields;
              break;
            }
          }
        }
      }

      const suggestions = provideFieldSuggestions(position, fieldsToSuggest, parsed);

      return { suggestions };
    },
  });
}

/**
 * Find the indentation level of the nearest parent object field.
 */
function findParentObjectIndent(lines: string[], lineNumber: number, currentIndent: number): number | null {
  for (let i = lineNumber; i >= 0; i--) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    if (indent >= currentIndent) continue;

    const parsed = parseYamlKeyValueLine(line);
    if (parsed && parsed.indent === indent) {
      // Check if this line defines an object
      if (currentFieldDefs && currentFieldDefs[parsed.key]) {
        const spec = { types: {} } as any;
        const field = resolveTypeAlias(currentFieldDefs[parsed.key], spec);
        if (field.type === 'object' && field.fields) {
          return indent;
        }
      }
    }
  }

  return null;
}

/**
 * Generate field name suggestions.
 */
function provideFieldSuggestions(
  position: IPosition,
  fields: { [key: string]: FieldDef },
  parsed: { key: string; value: string; indent: number }
): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = [];

  for (const fieldName in fields) {
    // Skip if this field is already present on the line
    if (parsed.key === fieldName) continue;

    const field = fields[fieldName];
    const isRequired = field.required;
    const resolved = resolveTypeAlias(field, { types: {} } as any);

    let insertText: string = fieldName + ': ';
    let detail: string = String(resolved.type);
    let kind = monaco.languages.CompletionItemKind.Property;

    // Add type-specific default hints
    switch (resolved.type) {
      case 'string':
        insertText = fieldName + ': ""';
        break;
      case 'number':
        insertText = fieldName + ': 0';
        break;
      case 'boolean':
        insertText = fieldName + ': false';
        break;
      case 'enum':
        if (resolved.options && resolved.options.length > 0) {
          insertText = fieldName + ': ' + resolved.options[0];
          detail = 'enum (' + resolved.options.join(', ') + ')';
        }
        break;
      case 'object':
        insertText = fieldName + ':';
        detail = 'object { ... }';
        kind = monaco.languages.CompletionItemKind.Folder;
        break;
      case 'array':
        insertText = fieldName + ':';
        detail = 'array';
        kind = monaco.languages.CompletionItemKind.Folder;
        break;
      case 'reference':
        insertText = fieldName + ':';
        detail = 'reference -> ' + (resolved.target || '?');
        kind = monaco.languages.CompletionItemKind.Reference;
        break;
    }

    suggestions.push({
      label: fieldName,
      kind,
      detail: isRequired ? detail + ' (required)' : detail,
      insertText,
      sortText: isRequired ? '0' + fieldName : '1' + fieldName,
      range: {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column,
        endColumn: position.column,
      },
      documentation: field.description || 'Field of type ' + String(resolved.type),
    });
  }

  return suggestions;
}

/**
 * Register the reference pointer completion provider.
 * Shows records from the target database by display name.
 */
function registerReferenceCompletionProvider(): void {
  const provider = monaco.languages.registerCompletionItemProvider('yaml', {

    provideCompletionItems(model, position, _context, _token) {
      const lineText = model.getLineContent(position.lineNumber);
      const parsed = parseYamlKeyValueLine(lineText);

      if (!parsed || !currentFieldDefs) {
        return { suggestions: [] };
      }

      const spec = getSpec();
      if (!spec) return { suggestions: [] };

      // Find the field definition for this key
      const field = findFieldForKey(parsed.key, parsed.indent, currentFieldDefs, spec);

      if (!field || !isReferenceField(field)) {
        return { suggestions: [] };
      }

      const targetDb = getReferenceTarget(field);
      if (!targetDb) {
        return { suggestions: [] };
      }

      // Load records from the target database
      const records = getRecords(targetDb);
      if (!records || records.length === 0) {
        return { suggestions: [] };
      }

      // Get the target database definition for display name generation
      const targetDbDef = spec.databases[targetDb];
      if (!targetDbDef) {
        return { suggestions: [] };
      }

      // Build completion items from records
      const suggestions: monaco.languages.CompletionItem[] = [];

      for (const record of records) {
        if (!record.id) continue;

        const displayName = generateDisplayName(record, targetDbDef);
        const guid = record.id;

        // Only show records that match what the user has typed (partial display name match)
        if (parsed.value && displayName.toLowerCase().indexOf(parsed.value.toLowerCase()) === -1) {
          continue;
        }

        suggestions.push({
          label: displayName,
          kind: monaco.languages.CompletionItemKind.Folder,
          detail: guid,
          insertText: guid,
          sortText: displayName.toLowerCase(),
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: model.getLineMaxColumn(position.lineNumber),
          },
          documentation: {
            value: '**' + displayName + '**\n\nID: `' + guid + '`\nDatabase: `' + targetDb + '`',
            isTrusted: true,
          },
        });
      }

      // Sort by display name
      suggestions.sort((a, b) => {
        const aSort = a.sortText || '';
        const bSort = b.sortText || '';
        return aSort.localeCompare(bSort);
      });

      return { suggestions };
    },
  });
}

/**
 * Update ghost text decorations showing display names after reference GUID values.
 */
export function updateGhostText(
  editor: monaco.editor.IStandaloneCodeEditor,
  callbacks: LspCallbacks
) {
  if (!ghostDecorationCollection) return;

  const model = editor.getModel();
  if (!model) return;

  const spec = getSpec();
  if (!spec) return;
  const content = callbacks.getEditorContent();
  const lines = content.split(/\r?\n/);

  // Clear existing decorations
  ghostDecorationCollection.clear();

  // Parse each line to find reference field values (GUIDs)
  const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parsed = parseYamlKeyValueLine(line);

    if (!parsed || !parsed.key || !parsed.value) continue;

    // Check if this field is a reference type
    const field = findFieldForKey(parsed.key, parsed.indent, currentFieldDefs || {}, spec);

    if (!field || !isReferenceField(field)) continue;

    const targetDb = getReferenceTarget(field);
    if (!targetDb) continue;

    // Check if the value looks like a UUID
    const guid = parsed.value;
    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(guid)) continue;

    // Load target records and look up the GUID
    const records = getRecords(targetDb);
    const targetDbDef = spec.databases[targetDb];

    if (!targetDbDef) continue;

    const matchedRecord = records.find(r => r.id === guid);
    if (!matchedRecord) continue;

    // Find the display name
    const displayName = generateDisplayName(matchedRecord, targetDbDef);

    // Calculate the column positions for the GUID value
    const lineContent = model.getLineContent(i + 1);
    const escapedKey = parsed.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const valueMatch = lineContent.match(new RegExp('^' + ' '.repeat(parsed.indent) + escapedKey + ':\\s*\\S+'));

    if (!valueMatch) continue;

    const startColumn = valueMatch[0].length - guid.length + 1;
    const endColumn = startColumn + guid.length;

    // Add ghost text decoration using injected text
    newDecorations.push({
      range: new monaco.Range(i + 1, startColumn, i + 1, endColumn),
      options: {
        isWholeLine: false,
        after: {
          content: ' // ' + displayName,
          cursorStops: monaco.editor.InjectedTextCursorStops.Both,
          inlineClassName: 'ghost-text',
        },
      },
    });
  }

  if (newDecorations.length > 0) {
    ghostDecorationCollection.set(newDecorations);
  }
}

/**
 * Update field definitions cache when the database changes.
 */
export function updateFieldDefs(databaseName: string | null, fieldDefs: { [key: string]: FieldDef } | null): void {
  currentDatabaseName = databaseName;
  currentFieldDefs = fieldDefs;
}
