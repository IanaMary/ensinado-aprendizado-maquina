import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'markdown', standalone: false })
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';
    let html = this.escapeHtml(value);

    // Tables (before other rules to avoid conflicts)
    html = this.parseTables(html);

    // Code blocks ```...```
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang, code) =>
      `<pre class="md-code"><code>${code.trim()}</code></pre>`
    );

    // Inline code `...`
    html = html.replace(/`([^`]+)`/g, '<code class="md-inline">$1</code>');

    // Headings (###, ##, #) — antes de bold/italic para nao conflitar
    html = html.replace(/^###\s+(.+)$/gm, '<h4 class="md-h">$1</h4>');
    html = html.replace(/^##\s+(.+)$/gm, '<h3 class="md-h">$1</h3>');
    html = html.replace(/^#\s+(.+)$/gm, '<h2 class="md-h">$1</h2>');

    // Bold **...**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic *...*
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

    // Line breaks (preservar quebras de linha, mas evitar <p> para cada linha)
    html = html.replace(/\n/g, '<br>');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private parseTables(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Check if this line is a table header (starts and ends with |)
      if (line.startsWith('|') && line.endsWith('|') && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        // Check if next line is a separator (|---|---|...)
        if (/^\|[\s\-:|]+\|$/.test(nextLine)) {
          // Parse table
          const headers = this.parseTableRow(line);
          const alignments = this.parseAlignments(nextLine);
          let tableHtml = '<table class="md-table"><thead><tr>';
          headers.forEach((h, idx) => {
            const align = alignments[idx] || 'left';
            tableHtml += `<th style="text-align:${align}">${h.trim()}</th>`;
          });
          tableHtml += '</tr></thead><tbody>';

          i += 2; // skip header and separator
          while (i < lines.length) {
            const rowLine = lines[i].trim();
            if (!rowLine.startsWith('|') || !rowLine.endsWith('|')) break;
            const cells = this.parseTableRow(rowLine);
            tableHtml += '<tr>';
            cells.forEach((c, idx) => {
              const align = alignments[idx] || 'left';
              tableHtml += `<td style="text-align:${align}">${c.trim()}</td>`;
            });
            tableHtml += '</tr>';
            i++;
          }
          tableHtml += '</tbody></table>';
          result.push(tableHtml);
          continue;
        }
      }

      result.push(lines[i]);
      i++;
    }

    return result.join('\n');
  }

  private parseTableRow(line: string): string[] {
    return line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
  }

  private parseAlignments(separatorLine: string): string[] {
    const cells = this.parseTableRow(separatorLine);
    return cells.map(cell => {
      const trimmed = cell.trim();
      if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
      if (trimmed.endsWith(':')) return 'right';
      return 'left';
    });
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
