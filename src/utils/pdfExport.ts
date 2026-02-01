import jsPDF from 'jspdf';

/**
 * Convert markdown content to PDF
 * Uses text-based rendering for clean, professional PDFs without rendering artifacts
 */
export async function exportMarkdownToPDF(
  markdownContent: string,
  filename: string,
  title?: string
): Promise<void> {
  try {
    // Create PDF with proper A4 dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 20;
    const marginY = 20;
    const contentWidth = pageWidth - (2 * marginX);
    const maxY = pageHeight - marginY;
    
    let currentY = marginY;
    
    // Helper to add new page if needed
    const checkPageBreak = (neededSpace: number = 10) => {
      if (currentY + neededSpace > maxY) {
        pdf.addPage();
        currentY = marginY;
        return true;
      }
      return false;
    };
    
    // Add title if provided and markdown doesn't start with H1
    const hasH1 = markdownContent.trim().startsWith('# ');
    if (title && !hasH1) {
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(26, 26, 26);
      
      const titleLines = pdf.splitTextToSize(title, contentWidth);
      titleLines.forEach((line: string) => {
        checkPageBreak(12);
        pdf.text(line, marginX, currentY);
        currentY += 12;
      });
      currentY += 8;
    }
    
    // Parse and render markdown content
    const elements = parseMarkdownToElements(markdownContent);
    
    for (const element of elements) {
      switch (element.type) {
        case 'h1':
          checkPageBreak(14);
          pdf.setFontSize(22);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(26, 26, 26);
          const h1Lines = pdf.splitTextToSize(element.content, contentWidth);
          h1Lines.forEach((line: string) => {
            pdf.text(line, marginX, currentY);
            currentY += 11;
          });
          currentY += 6;
          break;
          
        case 'h2':
          checkPageBreak(12);
          pdf.setFontSize(18);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(26, 26, 26);
          const h2Lines = pdf.splitTextToSize(element.content, contentWidth);
          h2Lines.forEach((line: string) => {
            pdf.text(line, marginX, currentY);
            currentY += 9;
          });
          currentY += 5;
          break;
          
        case 'h3':
          checkPageBreak(10);
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(26, 26, 26);
          const h3Lines = pdf.splitTextToSize(element.content, contentWidth);
          h3Lines.forEach((line: string) => {
            pdf.text(line, marginX, currentY);
            currentY += 8;
          });
          currentY += 4;
          break;
          
        case 'paragraph':
          checkPageBreak(8);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(51, 51, 51);
          const paraLines = pdf.splitTextToSize(element.content, contentWidth);
          paraLines.forEach((line: string) => {
            checkPageBreak(6);
            pdf.text(line, marginX, currentY);
            currentY += 6;
          });
          currentY += 4;
          break;
          
        case 'list-item':
          checkPageBreak(7);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(51, 51, 51);
          pdf.text('•', marginX, currentY);
          const listLines = pdf.splitTextToSize(element.content, contentWidth - 8);
          listLines.forEach((line: string, idx: number) => {
            if (idx > 0) checkPageBreak(6);
            pdf.text(line, marginX + 8, currentY);
            currentY += 6;
          });
          break;
          
        case 'code-block':
          checkPageBreak(15);
          pdf.setFillColor(243, 244, 246);
          const codeHeight = element.content.split('\n').length * 5 + 8;
          
          // Check if code block fits, if not add page
          if (currentY + codeHeight > maxY) {
            pdf.addPage();
            currentY = marginY;
          }
          
          pdf.rect(marginX, currentY - 3, contentWidth, codeHeight, 'F');
          pdf.setFontSize(10);
          pdf.setFont('courier', 'normal');
          pdf.setTextColor(51, 51, 51);
          
          const codeLines = element.content.split('\n');
          codeLines.forEach((line: string) => {
            pdf.text(line, marginX + 3, currentY + 2);
            currentY += 5;
          });
          currentY += 8;
          break;
          
        case 'table':
          checkPageBreak(20);
          renderTable(pdf, element.content, marginX, currentY, contentWidth);
          currentY += element.content.rows.length * 8 + 15;
          break;
          
        case 'blockquote':
          checkPageBreak(8);
          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(1);
          pdf.line(marginX, currentY - 2, marginX, currentY + 8);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(107, 114, 128);
          const quoteLines = pdf.splitTextToSize(element.content, contentWidth - 10);
          quoteLines.forEach((line: string) => {
            checkPageBreak(6);
            pdf.text(line, marginX + 6, currentY);
            currentY += 6;
          });
          currentY += 4;
          break;
          
        case 'hr':
          checkPageBreak(5);
          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.5);
          pdf.line(marginX, currentY, pageWidth - marginX, currentY);
          currentY += 8;
          break;
      }
    }
    
    // Download the PDF
    pdf.save(filename);
    
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  }
}

/**
 * Parse markdown content into structured elements for PDF rendering
 */
interface MarkdownElement {
  type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'list-item' | 'code-block' | 'table' | 'blockquote' | 'hr';
  content: any;
}

function parseMarkdownToElements(markdown: string): MarkdownElement[] {
  const elements: MarkdownElement[] = [];
  const lines = markdown.split('\n');
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }
    
    // Headers
    if (trimmed.startsWith('# ')) {
      elements.push({ type: 'h1', content: cleanMarkdownFormatting(trimmed.substring(2)) });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push({ type: 'h2', content: cleanMarkdownFormatting(trimmed.substring(3)) });
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push({ type: 'h3', content: cleanMarkdownFormatting(trimmed.substring(4)) });
      i++;
      continue;
    }
    
    // Horizontal rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push({ type: 'hr', content: '' });
      i++;
      continue;
    }
    
    // Code blocks
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++; // Skip opening ```
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      elements.push({ type: 'code-block', content: codeLines.join('\n') });
      continue;
    }
    
    // Tables
    if (trimmed.includes('|') && i + 1 < lines.length && lines[i + 1].trim().match(/^\|?[-:\s|]+\|?$/)) {
      const tableData = parseMarkdownTable(lines, i);
      if (tableData) {
        elements.push({ type: 'table', content: tableData.content });
        i = tableData.nextIndex;
        continue;
      }
    }
    
    // Blockquotes
    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(cleanMarkdownFormatting(lines[i].trim().substring(2)));
        i++;
      }
      elements.push({ type: 'blockquote', content: quoteLines.join(' ') });
      continue;
    }
    
    // List items
    if (trimmed.match(/^[-*+]\s+/) || trimmed.match(/^\d+\.\s+/)) {
      const content = trimmed.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '');
      elements.push({ type: 'list-item', content: cleanMarkdownFormatting(content) });
      i++;
      continue;
    }
    
    // Paragraphs (collect consecutive lines)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const currentLine = lines[i].trim();
      if (!currentLine) break;
      if (currentLine.startsWith('#') || currentLine.startsWith('```') || 
          currentLine.startsWith('>') || currentLine.match(/^[-*+]\s+/) ||
          currentLine === '---' || currentLine === '***') {
        break;
      }
      paraLines.push(currentLine);
      i++;
    }
    if (paraLines.length > 0) {
      elements.push({ type: 'paragraph', content: cleanMarkdownFormatting(paraLines.join(' ')) });
    }
  }
  
  return elements;
}

/**
 * Clean markdown formatting (bold, italic, code, links)
 */
function cleanMarkdownFormatting(text: string): string {
  return text
    // Remove bold
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    // Remove italic
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Convert links to text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
}

/**
 * Parse markdown table
 */
function parseMarkdownTable(lines: string[], startIndex: number): { content: any; nextIndex: number } | null {
  const headerLine = lines[startIndex].trim();
  const separatorLine = lines[startIndex + 1].trim();
  
  // Parse headers
  const headers = headerLine.split('|')
    .filter(cell => cell.trim())
    .map(cell => cell.trim());
  
  // Parse rows
  const rows: string[][] = [];
  let i = startIndex + 2;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line.includes('|')) break;
    
    const cells = line.split('|')
      .filter(cell => cell.trim())
      .map(cell => cleanMarkdownFormatting(cell.trim()));
    
    if (cells.length > 0) {
      rows.push(cells);
    }
    i++;
  }
  
  return {
    content: { headers, rows },
    nextIndex: i
  };
}

/**
 * Render table in PDF
 */
function renderTable(pdf: jsPDF, tableData: { headers: string[]; rows: string[][] }, x: number, y: number, width: number): void {
  const colCount = tableData.headers.length;
  const colWidth = width / colCount;
  const rowHeight = 8;
  
  // Draw header
  pdf.setFillColor(249, 250, 251);
  pdf.rect(x, y, width, rowHeight, 'F');
  pdf.setDrawColor(229, 231, 235);
  pdf.rect(x, y, width, rowHeight, 'S');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(51, 51, 51);
  
  tableData.headers.forEach((header, i) => {
    const cellX = x + (i * colWidth) + 2;
    const cellY = y + 6;
    const cellText = pdf.splitTextToSize(header, colWidth - 4);
    pdf.text(cellText[0] || '', cellX, cellY);
    
    // Draw vertical lines
    if (i < colCount - 1) {
      pdf.line(x + ((i + 1) * colWidth), y, x + ((i + 1) * colWidth), y + rowHeight);
    }
  });
  
  // Draw rows
  pdf.setFont('helvetica', 'normal');
  let currentY = y + rowHeight;
  
  tableData.rows.forEach((row) => {
    pdf.rect(x, currentY, width, rowHeight, 'S');
    
    row.forEach((cell, i) => {
      const cellX = x + (i * colWidth) + 2;
      const cellY = currentY + 6;
      const cellText = pdf.splitTextToSize(cell, colWidth - 4);
      pdf.text(cellText[0] || '', cellX, cellY);
      
      // Draw vertical lines
      if (i < colCount - 1) {
        pdf.line(x + ((i + 1) * colWidth), currentY, x + ((i + 1) * colWidth), currentY + rowHeight);
      }
    });
    
    currentY += rowHeight;
  });
}

