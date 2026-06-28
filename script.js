/* -------------------------------------------------
   OCR Web App – main client‑side logic
   ------------------------------------------------- */
const dropZone   = document.getElementById('drop-zone');
const fileInput  = document.getElementById('file-input');
const fileBtn    = document.getElementById('file-btn');
const previewImg = document.getElementById('preview-img');
const previewWrp = document.getElementById('preview-wrapper');
const removeImg  = document.getElementById('remove-img');
const ocrBtn     = document.getElementById('ocr-btn');
const outputBox  = document.getElementById('output');
const copyBtn    = document.getElementById('copy-btn');
const loader     = document.getElementById('loader');
const progress   = document.getElementById('progress');
const langSelect = document.getElementById('lang-select');

let selectedFile = null;

/* ---------- Helper UI ---------- */
function showPreview(file) {
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    previewWrp.classList.remove('hidden');
}
function hidePreview() {
    previewImg.src = '';
    previewWrp.classList.add('hidden');
    if (selectedFile) URL.revokeObjectURL(previewImg.src);
    selectedFile = null;
}
function toggleLoader(show, percent = 0) {
    loader.classList.toggle('hidden', !show);
    progress.textContent = `Processing… ${percent}%`;
}

/* ---------- File handling ---------- */
fileBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) setFile(file);
});

dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
});

removeImg.addEventListener('click', hidePreview);

function setFile(file) {
    // Basic validation – allow only images, max 5 MB
    if (!file.type.startsWith('image/')) {
        alert('❌ Only image files are allowed.');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        alert('❌ File is too large (max 5 MB).');
        return;
    }
    selectedFile = file;
    showPreview(file);
}

/* ---------- OCR processing ---------- */
ocrBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        alert('🚫 Please upload an image first.');
        return;
    }
    toggleLoader(true, 0);
    outputBox.value = '';
    try {
        // Optional – upload to PHP backend first
        await uploadToServer(selectedFile);

        const worker = await Tesseract.createWorker(langSelect.value, 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const pct = Math.round(m.progress * 100);
                    toggleLoader(true, pct);
                }
            }
        });
        const { data } = await worker.recognize(selectedFile);
        outputBox.value = data.text.trim();
        await worker.terminate();
    } catch (err) {
        console.error(err);
        alert('❌ OCR failed. See console for details.');
    } finally {
        toggleLoader(false);
    }
});

/* ---------- Copy to clipboard ---------- */
copyBtn.addEventListener('click', async () => {
    if (!outputBox.value) return;
    try {
        await navigator.clipboard.writeText(outputBox.value);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy Text', 1500);
    } catch (e) {
        alert('❌ Unable to copy.');
    }
});

/* ---------- Optional PHP upload ---------- */
async function uploadToServer(file) {
    const form = new FormData();
    form.append('image', file);
    try {
        const resp = await fetch('upload.php', {
            method: 'POST',
            body: form
        });
        const json = await resp.json();
        if (!json.success) throw new Error(json.error);
        console.log('Uploaded to server:', json.path);
    } catch (err) {
        console.error('Upload failed:', err);
    }
}
