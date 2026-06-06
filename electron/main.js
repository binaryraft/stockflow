const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

let mainWindow;
let nextServer;
const PORT = 3000;

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function startNextServer() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Starting Next.js server...');
    const localIp = getLocalIpAddress();
    console.log(`Local Access URL: http://${localIp}:${PORT}`);

    nextServer = spawn('npm', ['run', 'start'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: PORT, HOST: '0.0.0.0', NEXT_PUBLIC_APP_MODE: 'desktop' },
      shell: true,
    });

    nextServer.stdout.on('data', (data) => console.log(`Next.js: ${data}`));
    nextServer.stderr.on('data', (data) => console.error(`Next.js Error: ${data}`));
  } else {
    console.log("Dev Mode: Assuming server is already running via 'npm run dev'");
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'ecbills.in',
    icon: path.join(__dirname, '../public/logo.svg'),
  });

  const localIp = getLocalIpAddress();
  setTimeout(() => {
    mainWindow.loadURL(`http://localhost:${PORT}`);
    console.log('\n\n=================================================');
    console.log('ECBILLS.IN DESKTOP SERVER RUNNING');
    console.log(`To connect other devices (Employees), use: http://${localIp}:${PORT}`);
    console.log('=================================================\n\n');
  }, 5000);

  mainWindow.on('closed', function () {
    mainWindow = null;
    if (nextServer) nextServer.kill();
  });
}

async function printHtml(html, deviceName) {
  if (!html || typeof html !== 'string') {
    return { success: false, error: 'No print content was provided.' };
  }

  return new Promise((resolve) => {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    let finished = false;
    const finish = (result) => {
      if (finished) return;
      finished = true;
      if (!printWindow.isDestroyed()) {
        printWindow.close();
      }
      resolve(result);
    };

    printWindow.webContents.once('did-fail-load', (_event, _code, description) => {
      finish({ success: false, error: description || 'Print document failed to load.' });
    });

    printWindow.webContents.once('did-finish-load', () => {
      printWindow.webContents.print(
        {
          silent: Boolean(deviceName),
          deviceName: deviceName || undefined,
          printBackground: true,
        },
        (success, failureReason) => {
          finish({
            success,
            error: success ? undefined : failureReason || 'Printer did not accept the document.',
          });
        }
      );
    });

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  });
}

ipcMain.handle('printers:list', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return [];
  }

  const printers = await mainWindow.webContents.getPrintersAsync();
  return printers.map((printer) => ({
    name: printer.name,
    displayName: printer.displayName || printer.name,
    description: printer.description || '',
    isDefault: Boolean(printer.isDefault),
    status: printer.status,
  }));
});

ipcMain.handle('printers:print-html', async (_event, payload) => {
  try {
    return await printHtml(payload?.html, payload?.deviceName);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Print failed.',
    };
  }
});

app.on('ready', () => {
  startNextServer();
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
  if (nextServer) nextServer.kill();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});
