const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ecbillsPrinter', {
  getPrinters: () => ipcRenderer.invoke('printers:list'),
  printHtml: (html, deviceName) => ipcRenderer.invoke('printers:print-html', { html, deviceName }),
});
