const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');

let mainWindow;
let nextProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (nextProcess) nextProcess.kill();
  });
}

app.whenReady().then(() => {
  nextProcess = spawn('npm', ['run', 'start'], { shell: true, stdio: 'inherit' });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (nextProcess) nextProcess.kill();
    app.quit();
  }
});
