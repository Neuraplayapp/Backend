import { EventEmitter } from 'events';

/**
 * TypeScriptWriter – utility for incrementally building TypeScript/JavaScript source files.
 *
 * Typical usage:
 *   const writer = new TypeScriptWriter();
 *   writer.addImport('react', ['useState', 'FC']);
 *   writer.openBlock('export const Counter: FC = () =>');
 *   writer.writeLine('const [count,setCount] = useState(0);');
 *   writer.writeLine('return <button onClick={() => setCount(c => c+1)}>Count: {count}</button>;');
 *   writer.closeBlock();
 *   console.log(writer.getCode());
 *
 * The writer emits a `line` event every time a new line is committed so callers
 * (e.g. CodeCanvasManager) can live-stream updates to the canvas console.
 */
export class TypeScriptWriter extends EventEmitter {
  private lines: string[] = [];
  private indentLevel = 0;
  private indentStr = '  ';

  /** Write raw text without newline */
  write(text: string): void {
    if (text.length === 0) return;
    const prefixed = this.getIndent() + text;
    this.lines.push(prefixed);
    this.emit('line', prefixed);
  }

  /** Write text followed by newline */
  writeLine(text: string = ''): void {
    this.write(text);
    // ensure line break for visual stream consumers
    this.emit('newline');
  }

  /** Helper to add import statements */
  addImport(moduleName: string, symbols: string[] | string = '*', isTypeOnly = false): void {
    let clause: string;
    if (Array.isArray(symbols)) {
      clause = `{ ${symbols.join(', ')} }`;
    } else if (symbols === 'default') {
      clause = symbols;
    } else {
      clause = `* as ${symbols}`;
    }
    const typePrefix = isTypeOnly ? 'import type' : 'import';
    this.writeLine(`${typePrefix} ${clause} from '${moduleName}';`);
    this.writeLine();
  }

  /** Open a new block and increase indentation */
  openBlock(header: string): void {
    this.writeLine(header + ' {');
    this.indentLevel++;
  }

  /** Close the current block */
  closeBlock(): void {
    if (this.indentLevel > 0) {
      this.indentLevel--;
    }
    this.writeLine('}');
  }

  /** Insert a blank line */
  newline(): void {
    this.writeLine();
  }

  /** Clear existing code */
  reset(): void {
    this.lines = [];
    this.indentLevel = 0;
  }

  /** Return the generated code as a single string */
  getCode(): string {
    return this.lines.join('\n');
  }

  /** Persist code to a downloadable Blob (browser-only helper) */
  toBlob(fileName = 'snippet.ts'): Blob {
    return new Blob([this.getCode()], { type: 'text/typescript' });
  }

  private getIndent(): string {
    return this.indentStr.repeat(this.indentLevel);
  }
}

// Convenience factory (singleton not enforced)
export const createTypeScriptWriter = () => new TypeScriptWriter();
