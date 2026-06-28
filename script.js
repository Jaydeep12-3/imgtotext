/* -------------------------------------------------
   OCR Web App – main client‑side logic
   ------------------------------------------------- */
const dropZone   = document.getElementById('drop-zone');
const fileInput  = document.getElementById('file-input');
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
    dropZone.classList.add('hidden');
}
function hidePreview() {
    previewImg.src = '';
    previewWrp.classList.add('hidden');
    dropZone.classList.remove('hidden');
    if (selectedFile) URL.revokeObjectURL(previewImg.src);
    selectedFile = null;
    outputBox.value = '';
}
function toggleLoader(show, percent = 0) {
    loader.classList.toggle('hidden', !show);
    if (show) {
        progress.textContent = `Processing… ${percent}%`;
    }
}

/* ---------- File handling ---------- */
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) setFile(file);
    e.target.value = '';
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
    if (!file.type.startsWith('image/')) {
        alert('❌ Only image files are allowed.');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        alert('❌ File is too large (max 5 MB).');
        return;
    }
    selectedFile = file;
    showPreview(file);
}

/* ---------- Image Preprocessing (Improves OCR Accuracy) ---------- */
function preprocessImage(file) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Upscale image by 2x (Tesseract loves higher resolution, around 300dpi)
            const scale = 2;
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            // Draw scaled image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Get image data for grayscale conversion
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                // Convert to grayscale
                const avg = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
                data[i] = avg;     // Red
                data[i+1] = avg;   // Green
                data[i+2] = avg;   // Blue
            }
            
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
    });
}

/* ---------- OCR processing ---------- */
ocrBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        alert('🚫 Please upload an image first.');
        return;
    }
    toggleLoader(true, 0);
    outputBox.value = 'Preparing image for better accuracy...';
    
    try {
        // Preprocess image before feeding to Tesseract
        const processedImageBase64 = await preprocessImage(selectedFile);

        const worker = await Tesseract.createWorker(langSelect.value, 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const pct = Math.round(m.progress * 100);
                    toggleLoader(true, pct);
                }
            }
        });
        
        // Pass the preprocessed image instead of the raw file
        const { data } = await worker.recognize(processedImageBase64);
        
        // Clean up the text (remove excessive newlines and weird symbols)
        let cleanedText = data.text.trim();
        cleanedText = cleanedText.replace(/\n\s*\n/g, '\n\n'); // Max 2 consecutive newlines
        
        outputBox.value = cleanedText || "No text could be extracted. Try a clearer image.";
        await worker.terminate();
    } catch (err) {
        console.error(err);
        alert('❌ OCR failed. See console for details.');
        outputBox.value = '';
    } finally {
        toggleLoader(false);
    }
});

/* ---------- Copy to clipboard ---------- */
copyBtn.addEventListener('click', async () => {
    if (!outputBox.value) return;
    try {
        await navigator.clipboard.writeText(outputBox.value);
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => copyBtn.innerHTML = originalHTML, 1500);
    } catch (e) {
        alert('❌ Unable to copy.');
    }
});
