export const SELECTED_PRINTER_STORAGE_KEY = 'ecbills_selected_printer';
export const PAPER_FORMAT_STORAGE_KEY = 'ecbills_paper_format';

export type PaperFormat = 'a4' | 'thermal-80mm' | 'thermal-58mm';

export const getPaperFormat = (): PaperFormat => {
  if (typeof window === 'undefined') return 'a4';
  return (localStorage.getItem(PAPER_FORMAT_STORAGE_KEY) as PaperFormat) || 'a4';
};

export const setPaperFormat = (format: PaperFormat) => {
  localStorage.setItem(PAPER_FORMAT_STORAGE_KEY, format);
};
