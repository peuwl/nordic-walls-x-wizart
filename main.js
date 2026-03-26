const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    title: 'Nordic Walls x WizArt',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC: file picker ──────────────────────────────────────────────────────────
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Shopify product export CSV',
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// ── IPC: run the Python pipeline ──────────────────────────────────────────────
ipcMain.handle('start-import', async (event, csvPath) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-wizart-'));

  // In production (packaged), use the bundled PyInstaller binary.
  // In development, use the system python3.
  let cmd, args;
  if (app.isPackaged) {
    const binaryName = process.platform === 'win32' ? 'run_import.exe' : 'run_import';
    cmd  = path.join(process.resourcesPath, binaryName);
    args = [csvPath, tempDir];
  } else {
    cmd  = process.platform === 'win32' ? 'python' : 'python3';
    args = [path.join(__dirname, 'python', 'run_import.py'), csvPath, tempDir];
  }

  return new Promise((resolve) => {
    const py = spawn(cmd, args, {
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
    });

    let zipPath = null;

    py.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (!line) continue;
        const zipMatch = line.match(/^ZIP_OUTPUT:(.+)$/);
        if (zipMatch) {
          zipPath = zipMatch[1].trim();
        } else {
          mainWindow.webContents.send('log', line);
        }
      }
    });

    py.stderr.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line) mainWindow.webContents.send('log', `[stderr] ${line}`);
      }
    });

    py.on('close', (code) => {
      if (code === 0 && zipPath) {
        mainWindow.webContents.send('done', { success: true, zipPath, tempDir });
        resolve({ success: true, zipPath, tempDir });
      } else {
        // Clean up temp dir on failure
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
        mainWindow.webContents.send('done', { success: false, zipPath: null, tempDir: null });
        resolve({ success: false });
      }
    });
  });
});

// ── IPC: save dialog + copy zip + cleanup ────────────────────────────────────
ipcMain.handle('save-zip', async (event, { zipPath, tempDir }) => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const defaultName = `Wizart Import Files - ${datePart} ${hh}.${mm}.zip`;

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save import zip',
    defaultPath: path.join(os.homedir(), 'Desktop', defaultName),
    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
  });

  if (result.canceled || !result.filePath) {
    // User cancelled — clean up anyway
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    return { saved: false };
  }

  fs.copyFileSync(zipPath, result.filePath);
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  return { saved: true, savedPath: result.filePath };
});
