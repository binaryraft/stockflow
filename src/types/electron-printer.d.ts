export {};

declare global {
  interface Window {
    ecbillsPrinter?: {
      getPrinters: () => Promise<
        Array<{
          name: string;
          displayName?: string;
          description?: string;
          isDefault?: boolean;
          status?: number;
        }>
      >;
      printHtml: (html: string, deviceName?: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}
