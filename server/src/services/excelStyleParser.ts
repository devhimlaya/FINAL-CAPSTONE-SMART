import ExcelJS from 'exceljs';

/**
 * Excel Style Parser - Extracts high-fidelity styling from Excel files
 * Converts Excel formatting to web-renderable JSON structure
 */

export interface CellStyle {
  backgroundColor?: string;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'bold' | 'normal';
  fontStyle?: 'italic' | 'normal';
  textDecoration?: 'underline' | 'none';
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  border?: {
    top?: BorderStyle;
    right?: BorderStyle;
    bottom?: BorderStyle;
    left?: BorderStyle;
  };
  wrapText?: boolean;
  numberFormat?: string;
}

export interface BorderStyle {
  style: string;
  color?: string;
}

export interface ParsedCell {
  row: number;
  col: number;
  value: any;
  formula?: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'formula' | 'empty';
  style: CellStyle;
  mergeInfo?: {
    rowSpan: number;
    colSpan: number;
    isMaster: boolean; // true for top-left cell of merge
  };
}

export interface ParsedSheet {
  name: string;
  rowCount: number;
  colCount: number;
  cells: ParsedCell[];
  columnWidths: number[]; // in pixels
  rowHeights: number[]; // in pixels
  mergedCells: string[]; // e.g., ["A1:C1", "B2:B4"]
}

export interface ParsedWorkbook {
  fileName: string;
  sheets: ParsedSheet[];
  metadata: {
    creator?: string;
    created?: Date;
    modified?: Date;
  };
}

export class ExcelStyleParser {
  
  /**
   * Parse an Excel file and extract all styling information
   * @param filePath - Path to Excel file
   * @returns Parsed workbook with full styling data
   */
  async parseExcelWithStyles(filePath: string): Promise<ParsedWorkbook> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const parsedSheets: ParsedSheet[] = [];

    for (const worksheet of workbook.worksheets) {
      const parsedSheet = this.parseWorksheet(worksheet);
      parsedSheets.push(parsedSheet);
    }

    return {
      fileName: filePath.split(/[/\\]/).pop() || 'unknown',
      sheets: parsedSheets,
      metadata: {
        creator: workbook.creator,
        created: workbook.created,
        modified: workbook.modified
      }
    };
  }

  /**
   * Parse a single worksheet
   */
  private parseWorksheet(worksheet: ExcelJS.Worksheet): ParsedSheet {
    const cells: ParsedCell[] = [];
    const mergedCells: string[] = [];
    const columnWidths: number[] = [];
    const rowHeights: number[] = [];

    // Extract merged cell ranges
    const mergedRanges = new Map<string, { rowSpan: number; colSpan: number; master: string }>();
    
    if (worksheet.model.merges) {
      worksheet.model.merges.forEach((merge: string) => {
        mergedCells.push(merge);
        const [start, end] = merge.split(':');
        const startCell = this.parseCellAddress(start);
        const endCell = this.parseCellAddress(end);
        
        const rowSpan = endCell.row - startCell.row + 1;
        const colSpan = endCell.col - startCell.col + 1;

        // Mark all cells in merge range
        for (let r = startCell.row; r <= endCell.row; r++) {
          for (let c = startCell.col; c <= endCell.col; c++) {
            const addr = this.getCellAddress(r, c);
            mergedRanges.set(addr, {
              rowSpan,
              colSpan,
              master: start
            });
          }
        }
      });
    }

    // Extract column widths
    const maxCol = worksheet.columnCount || 20;
    for (let i = 1; i <= maxCol; i++) {
      const col = worksheet.getColumn(i);
      // Convert Excel width units to pixels (approximate)
      const width = col.width ? col.width * 7 : 64; // Excel default is ~64px
      columnWidths.push(width);
    }

    // Process each row
    let maxRowIndex = 0;
    let maxColIndex = 0;

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      // Extract row height
      const height = row.height || 20; // Default row height
      rowHeights[rowNumber - 1] = height;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        maxRowIndex = Math.max(maxRowIndex, rowNumber);
        maxColIndex = Math.max(maxColIndex, colNumber);

        const cellAddr = this.getCellAddress(rowNumber, colNumber);
        const mergeInfo = mergedRanges.get(cellAddr);

        const parsedCell: ParsedCell = {
          row: rowNumber,
          col: colNumber,
          value: this.getCellValue(cell),
          type: this.getCellType(cell),
          style: this.extractCellStyle(cell),
        };

        // Add formula if present
        if (cell.formula) {
          parsedCell.formula = String(cell.formula);
        }

        // Add merge information
        if (mergeInfo) {
          parsedCell.mergeInfo = {
            rowSpan: mergeInfo.rowSpan,
            colSpan: mergeInfo.colSpan,
            isMaster: mergeInfo.master === cellAddr
          };
        }

        cells.push(parsedCell);
      });
    });

    return {
      name: worksheet.name,
      rowCount: maxRowIndex,
      colCount: maxColIndex,
      cells,
      columnWidths: columnWidths.slice(0, maxColIndex),
      rowHeights,
      mergedCells
    };
  }

  /**
   * Extract styling from a cell
   */
  private extractCellStyle(cell: ExcelJS.Cell): CellStyle {
    const style: CellStyle = {};

    // Background color
    if (cell.fill && 'fgColor' in cell.fill) {
      const fillColor = cell.fill.fgColor;
      if (fillColor && 'argb' in fillColor && fillColor.argb) {
        style.backgroundColor = this.argbToHex(fillColor.argb);
      }
    }

    // Font styling
    if (cell.font) {
      if (cell.font.color && 'argb' in cell.font.color && cell.font.color.argb) {
        style.color = this.argbToHex(cell.font.color.argb);
      }
      if (cell.font.name) {
        style.fontFamily = cell.font.name;
      }
      if (cell.font.size) {
        style.fontSize = cell.font.size;
      }
      if (cell.font.bold) {
        style.fontWeight = 'bold';
      }
      if (cell.font.italic) {
        style.fontStyle = 'italic';
      }
      if (cell.font.underline) {
        style.textDecoration = 'underline';
      }
    }

    // Alignment
    if (cell.alignment) {
      if (cell.alignment.horizontal) {
        style.textAlign = this.mapAlignment(cell.alignment.horizontal);
      }
      if (cell.alignment.vertical) {
        style.verticalAlign = this.mapVerticalAlignment(cell.alignment.vertical);
      }
      if (cell.alignment.wrapText) {
        style.wrapText = true;
      }
    }

    // Borders
    if (cell.border) {
      style.border = {};
      if (cell.border.top) {
        style.border.top = this.extractBorderStyle(cell.border.top);
      }
      if (cell.border.right) {
        style.border.right = this.extractBorderStyle(cell.border.right);
      }
      if (cell.border.bottom) {
        style.border.bottom = this.extractBorderStyle(cell.border.bottom);
      }
      if (cell.border.left) {
        style.border.left = this.extractBorderStyle(cell.border.left);
      }
    }

    // Number format
    if (cell.numFmt) {
      style.numberFormat = cell.numFmt;
    }

    return style;
  }

  /**
   * Extract border styling
   */
  private extractBorderStyle(border: Partial<ExcelJS.Border>): BorderStyle | undefined {
    if (!border.style) return undefined;

    const borderStyle: BorderStyle = {
      style: this.mapBorderStyle(border.style)
    };

    if (border.color && 'argb' in border.color && border.color.argb) {
      borderStyle.color = this.argbToHex(border.color.argb);
    }

    return borderStyle;
  }

  /**
   * Map Excel border style to CSS
   */
  private mapBorderStyle(style: string): string {
    const borderMap: Record<string, string> = {
      thin: '1px solid',
      medium: '2px solid',
      thick: '3px solid',
      dotted: '1px dotted',
      hair: '1px solid',
      dashed: '1px dashed',
      dashDot: '1px dashed',
      dashDotDot: '1px dashed',
      double: '3px double',
    };

    return borderMap[style] || '1px solid';
  }

  /**
   * Convert ARGB color to hex
   */
  private argbToHex(argb: string): string {
    if (argb.length === 8) {
      // Remove alpha channel, keep RGB
      return `#${argb.substring(2)}`;
    }
    return `#${argb}`;
  }

  /**
   * Map Excel alignment to CSS
   */
  private mapAlignment(align: string): 'left' | 'center' | 'right' {
    const alignMap: Record<string, 'left' | 'center' | 'right'> = {
      left: 'left',
      center: 'center',
      right: 'right',
      fill: 'left',
      justify: 'left',
      centerContinuous: 'center',
      distributed: 'center'
    };

    return alignMap[align] || 'left';
  }

  /**
   * Map Excel vertical alignment to CSS
   */
  private mapVerticalAlignment(align: string): 'top' | 'middle' | 'bottom' {
    const alignMap: Record<string, 'top' | 'middle' | 'bottom'> = {
      top: 'top',
      middle: 'middle',
      bottom: 'bottom',
      justify: 'top',
      distributed: 'middle'
    };

    return alignMap[align] || 'top';
  }

  /**
   * Get cell value handling different types
   */
  private getCellValue(cell: ExcelJS.Cell): any {
    if (cell.value === null || cell.value === undefined) {
      return '';
    }

    // Handle rich text
    if (typeof cell.value === 'object' && 'richText' in cell.value) {
      return cell.value.richText.map((rt: any) => rt.text).join('');
    }

    // Handle hyperlinks
    if (typeof cell.value === 'object' && 'text' in cell.value) {
      return cell.value.text;
    }

    // Handle dates
    if (cell.value instanceof Date) {
      return cell.value.toISOString();
    }

    return cell.value;
  }

  /**
   * Determine cell type
   */
  private getCellType(cell: ExcelJS.Cell): ParsedCell['type'] {
    if (cell.formula) return 'formula';
    if (cell.value === null || cell.value === undefined) return 'empty';
    if (cell.value instanceof Date) return 'date';
    if (typeof cell.value === 'number') return 'number';
    if (typeof cell.value === 'boolean') return 'boolean';
    return 'string';
  }

  /**
   * Parse cell address like "A1" to {row: 1, col: 1}
   */
  private parseCellAddress(address: string): { row: number; col: number } {
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match) throw new Error(`Invalid cell address: ${address}`);

    const col = this.columnLetterToNumber(match[1]);
    const row = parseInt(match[2], 10);

    return { row, col };
  }

  /**
   * Convert column letter to number (A=1, B=2, ..., Z=26, AA=27, etc.)
   */
  private columnLetterToNumber(letter: string): number {
    let col = 0;
    for (let i = 0; i < letter.length; i++) {
      col = col * 26 + (letter.charCodeAt(i) - 64);
    }
    return col;
  }

  /**
   * Get cell address from row/col numbers
   */
  private getCellAddress(row: number, col: number): string {
    return this.numberToColumnLetter(col) + row;
  }

  /**
   * Convert column number to letter (1=A, 2=B, ..., 26=Z, 27=AA, etc.)
   */
  private numberToColumnLetter(num: number): string {
    let letter = '';
    while (num > 0) {
      const remainder = (num - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      num = Math.floor((num - 1) / 26);
    }
    return letter;
  }
}

// Export singleton instance
export const excelStyleParser = new ExcelStyleParser();
