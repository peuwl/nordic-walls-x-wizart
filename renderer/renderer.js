/* ── Elements ───────────────────────────────────────── */
const dropZone       = document.getElementById('drop-zone');
const browseBtn      = document.getElementById('browse-btn');
const selectedFile   = document.getElementById('selected-file');
const fileNameLabel  = document.getElementById('file-name-label');
const changeBtn      = document.getElementById('change-btn');
const startBtn       = document.getElementById('start-btn');
const terminal       = document.getElementById('terminal');
const statusText     = document.getElementById('status-text');
const infoBtn        = document.getElementById('info-btn');
const modalOverlay   = document.getElementById('modal-overlay');
const modalClose     = document.getElementById('modal-close');

let selectedCsvPath  = null;
let importRunning    = false;

/* ── File selection ─────────────────────────────────── */
function setFile(filePath) {
  selectedCsvPath = filePath;
  const parts = filePath.split(/[/\\]/);
  fileNameLabel.textContent = parts[parts.length - 1];
  dropZone.classList.add('hidden');
  selectedFile.classList.remove('hidden');
  startBtn.disabled = false;
  setStatus('File selected — ready to import.');
}

browseBtn.addEventListener('click', async () => {
  const filePath = await window.api.selectFile();
  if (filePath) setFile(filePath);
});

changeBtn.addEventListener('click', () => {
  selectedCsvPath = null;
  selectedFile.classList.add('hidden');
  dropZone.classList.remove('hidden');
  startBtn.disabled = true;
  setStatus('Ready');
});

/* ── Drag & drop ────────────────────────────────────── */
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

['dragleave', 'dragend'].forEach(evt =>
  dropZone.addEventListener(evt, () => dropZone.classList.remove('drag-over'))
);

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.name.endsWith('.csv')) {
    setFile(file.path);
  } else {
    appendLine('Please drop a .csv file.', 'line-error');
  }
});

/* ── Terminal helpers ───────────────────────────────── */
function clearTerminal() {
  terminal.innerHTML = '';
}

function appendLine(text, cls = '') {
  const span = document.createElement('span');
  if (cls) span.className = cls;
  span.textContent = text + '\n';
  terminal.appendChild(span);
  terminal.scrollTop = terminal.scrollHeight;
}

function classifyLine(line) {
  if (line.startsWith('[stderr]'))     return 'line-stderr';
  if (/warning/i.test(line))           return 'line-warn';
  if (/^── Done/.test(line))           return 'line-done';
  if (/^ERROR|error/i.test(line))      return 'line-error';
  return '';
}

function setStatus(msg) {
  statusText.textContent = msg;
}

/* ── IPC listeners ──────────────────────────────────── */
window.api.onLog((line) => {
  appendLine(line, classifyLine(line));
});

window.api.onDone(async ({ success, zipPath, tempDir }) => {
  importRunning = false;
  startBtn.disabled = false;

  if (!success) {
    appendLine('\n✖  Import failed. See output above.', 'line-error');
    setStatus('Import failed.');
    return;
  }

  appendLine('\n✔  Import complete!', 'line-done');
  setStatus('Import complete — choose where to save the zip…');

  const result = await window.api.saveZip({ zipPath, tempDir });

  if (result.saved) {
    appendLine(`\n✔  Saved to: ${result.savedPath}`, 'line-done');
    setStatus('Done! All temporary files cleaned up.');
  } else {
    appendLine('\n—  Save cancelled. Temporary files removed.', 'line-warn');
    setStatus('Cancelled. Temporary files removed.');
  }
});

/* ── Info modal ─────────────────────────────────────── */
infoBtn.addEventListener('click', () => modalOverlay.classList.remove('hidden'));
modalClose.addEventListener('click', () => modalOverlay.classList.add('hidden'));
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') modalOverlay.classList.add('hidden');
});

/* ── Start import ───────────────────────────────────── */
startBtn.addEventListener('click', async () => {
  if (!selectedCsvPath || importRunning) return;

  importRunning = true;
  startBtn.disabled = true;
  clearTerminal();
  appendLine(`Starting import for: ${selectedCsvPath}\n`);
  setStatus('Import running…');

  await window.api.startImport(selectedCsvPath);
});
