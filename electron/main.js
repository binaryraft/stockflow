```
const { app, BrowserWindow } = require('electron');
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
     // In production, we assume we are running the built Next.js app
     // Ideally, we'd use `next start` or node server.js from the standalone build
     // For this wrapper, we try to run `npm start` or just expect the user to have it running if pure wrapper
     // But user asked for "perfectly wrapped". 
     // We will try to spawn 'npm run start' with env vars.
     
     // IMPORTANT: For a truly standalone exe, bundling the node runtime and next server is required. 
     // For now, we assume Node is present on the host or we rely on the dev environment context the user has.
     
     console.log("Starting Next.js Server...");
     const localIp = getLocalIpAddress();
     console.log(`Local Access URL: http://${localIp}:${PORT}`);

nextServer = spawn('npm', ['run', 'start'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: PORT, HOST: '0.0.0.0', NEXT_PUBLIC_APP_MODE: 'desktop' },
    shell: true
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
        },
        title: "StockFlow",
        icon: path.join(__dirname, '../public/logo.svg')
    });

    const localIp = getLocalIpAddress();
    // We load localhost for the main window, but the server binds to 0.0.0.0
    setTimeout(() => {
        mainWindow.loadURL(`http://localhost:${PORT}`);
        console.log(`\n\n=================================================`);
        console.log(`STOCKFLOW DESKTOP SERVER RUNNING`);
        console.log(`To connect other devices (Employees), use: http://${localIp}:${PORT}`);
        console.log(`=================================================\n\n`);
    }, 5000);

    mainWindow.on('closed', function () {
        mainWindow = null;
        if (nextServer) nextServer.kill();
    });
}

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
```
