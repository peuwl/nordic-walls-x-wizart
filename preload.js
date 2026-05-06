const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  startImport: (csvPath, mode) => ipcRenderer.invoke('start-import', csvPath, mode),
  saveZip: (zipPath) => ipcRenderer.invoke('save-zip', zipPath),
  onLog: (callback) => ipcRenderer.on('log', (_event, line) => callback(line)),
  onDone: (callback) => ipcRenderer.on('done', (_event, data) => callback(data)),
});
