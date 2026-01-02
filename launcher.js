const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const open = require('open'); // We might need to install 'open' or just use 'start' command

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

console.log("=================================================");
console.log("   STOCKFLOW - DESKTOP SERVER HUB");
console.log("=================================================");
console.log("Initializing...");

const localIp = getLocalIpAddress();
const appUrl = `http://${localIp}:${PORT}`;

console.log(`\nNetwork Access URL: ${appUrl}`);
console.log(`Local Access URL:   http://localhost:${PORT}`);
console.log("\nStarting Server Engine (this window must remain open)...");

// Path to the Next.js standalone server
// When packaged, we usually keep the 'standalone' folder next to the exe
const serverPath = path.join(process.cwd(), 'standalone', 'server.js');

const env = {
    ...process.env,
    PORT: PORT,
    item: '0.0.0.0', // hostname
    NEXT_PUBLIC_APP_MODE: 'desktop'
};

const server = spawn('node', [serverPath], {
    env: env,
    stdio: 'inherit', // Pipe output to this console
    shell: true
});

server.on('error', (err) => {
    console.error('Failed to start server:', err);
});

// Wait a few seconds for the server to boot, then open browser
setTimeout(() => {
    console.log(`\nLaunching Dashboard: ${appUrl}`);
    // Use dynamic import for 'open' or platform specific command
    // Simple platform agnostic 'open' via shell command
    const platform = os.platform();
    let command;
    let args = [];

    if (platform === 'win32') {
        command = 'start';
        args = [appUrl];
    } else if (platform === 'darwin') {
        command = 'open';
        args = [appUrl];
    } else {
        command = 'xdg-open';
        args = [appUrl];
    }

    spawn(command, args, { shell: true });

}, 4000);

// Handle exit
process.on('SIGINT', () => {
    server.kill();
    process.exit();
});
