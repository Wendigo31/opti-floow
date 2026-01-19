// File save utility with folder selection using File System Access API

export interface SaveFileOptions {
  suggestedName: string;
  types?: {
    description: string;
    accept: Record<string, string[]>;
  }[];
}

export async function saveFileWithPicker(
  content: Blob | string,
  options: SaveFileOptions
): Promise<boolean> {
  // Check if File System Access API is supported
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: options.suggestedName,
        types: options.types || [
          {
            description: 'All Files',
            accept: { '*/*': [] },
          },
        ],
      });

      const writable = await handle.createWritable();
      
      if (typeof content === 'string') {
        await writable.write(content);
      } else {
        await writable.write(content);
      }
      
      await writable.close();
      return true;
    } catch (error: any) {
      // User cancelled the dialog
      if (error.name === 'AbortError') {
        return false;
      }
      console.error('File save error:', error);
      // Fall back to traditional download
      fallbackDownload(content, options.suggestedName);
      return true;
    }
  } else {
    // Fall back to traditional download for unsupported browsers
    fallbackDownload(content, options.suggestedName);
    return true;
  }
}

function fallbackDownload(content: Blob | string, filename: string) {
  const blob = typeof content === 'string' 
    ? new Blob([content], { type: 'text/plain' }) 
    : content;
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Specific save functions for common file types

export async function savePDFWithPicker(
  pdfBlob: Blob,
  suggestedName: string
): Promise<boolean> {
  return saveFileWithPicker(pdfBlob, {
    suggestedName,
    types: [
      {
        description: 'Document PDF',
        accept: { 'application/pdf': ['.pdf'] },
      },
    ],
  });
}

export async function saveExcelWithPicker(
  excelBlob: Blob,
  suggestedName: string
): Promise<boolean> {
  return saveFileWithPicker(excelBlob, {
    suggestedName,
    types: [
      {
        description: 'Fichier Excel',
        accept: { 
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          'text/csv': ['.csv'],
        },
      },
    ],
  });
}

export async function saveJSONWithPicker(
  data: object,
  suggestedName: string
): Promise<boolean> {
  const jsonString = JSON.stringify(data, null, 2);
  return saveFileWithPicker(jsonString, {
    suggestedName,
    types: [
      {
        description: 'Fichier JSON',
        accept: { 'application/json': ['.json'] },
      },
    ],
  });
}
