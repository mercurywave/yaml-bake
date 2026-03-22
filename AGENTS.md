# AGENTS.md

## Build, Lint, and Test Commands

### Build Commands
- `npm run build` - Build the application for production
- `npm start` - Start the development server with hot reloading

### Linting
- `npm run lint` - Lint the TypeScript code (no lint command configured in package.json)

### Testing
- `npm test` - Run tests (currently shows "Error: no test specified")
- To run a single test: `npm test -- --testNamePattern="test name"` or run specific test files

### Code Style Guidelines

#### Imports
- Use explicit imports for better readability
- Group imports in order: external libraries, internal modules, local imports
- Sort imports alphabetically within each group

#### Formatting
- Use Prettier for code formatting (configured via TypeScript)
- Follow TypeScript/React code conventions
- Indent with 2 spaces
- Use single quotes for strings
- No trailing commas in object literals
- One statement per line

#### Types
- Use TypeScript interfaces and types for all data structures
- Prefer interfaces for object shapes
- Use union types for discriminated unions
- Define explicit types for function parameters and return values
- Use `readonly` for immutable properties

#### Naming Conventions
- PascalCase for component names (React components)
- camelCase for variables and functions
- UPPER_CASE for constants
- Prefix private members with underscore
- Descriptive names over abbreviations

#### Error Handling
- Use try/catch blocks for asynchronous operations
- Handle errors gracefully with user-friendly messages
- Implement proper error boundaries in React components
- Validate input at boundaries and in business logic
- Use custom error classes when appropriate

#### React Component Structure
- Use functional components with hooks
- Organize components from general to specific
- Keep components focused and single-responsibility
- Use proper TypeScript typing for props and state
- Use React's StrictMode for better error detection

#### File Organization
- Keep related components in the same file when appropriate
- Separate concerns: components, services, utilities, types
- Use descriptive file names with appropriate extensions
- Group related files in directories

#### Styling
- Use CSS modules or styled-components for styling
- Avoid inline styles when possible
- Keep styles organized and maintainable

#### Documentation
- Add JSDoc comments for complex functions
- Document complex business logic
- Include type information in comments when needed
- Keep documentation up to date with code changes

#### Security
- Never expose secrets in client-side code
- Validate all user inputs
- Sanitize data before rendering
- Follow CSP (Content Security Policy) guidelines

#### Performance
- Memoize expensive calculations using useMemo
- Avoid unnecessary re-renders
- Implement virtualization for large lists
- Use React.lazy for code splitting

This file serves as a guide for agents and developers working with this codebase.