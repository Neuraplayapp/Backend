import { EventEmitter } from 'events';

/**
 * DocumentWriter – incremental plain-text / markdown writer.
 * Emits a `line` event every time a new line is appended so UI
 * components can live-render the document (e.g. DocumentCanvas console).
 */
export class DocumentWriter extends EventEmitter {
  private lines: string[] = [];

  /** Append a line (string will be trimmed of trailing newlines). */
  append(line: string = ''): void {
    const clean = line.replace(/\n+$/, '');
    this.lines.push(clean);
    this.emit('line', clean);
  }

  /** Insert a blank line. */
  newline(): void {
    this.lines.push('');
    this.emit('line', '');
  }

  /** Clear current contents. */
  reset(): void {
    this.lines = [];
    this.emit('reset');
  }

  /** Get the full document. */
  getContent(): string {
    return this.lines.join('\n');
  }

  /** Download helper (browser only). */
  toBlob(_fileName = 'document.md'): Blob {
    return new Blob([this.getContent()], { type: 'text/markdown' });
  }
}

export const createDocumentWriter = () => new DocumentWriter();
