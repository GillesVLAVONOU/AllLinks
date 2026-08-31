const urlInput = document.getElementById('urlInput');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const thumbnailEl = document.getElementById('thumbnail');
const titleEl = document.getElementById('title');
const authorEl = document.getElementById('author');
const qualitySection = document.getElementById('qualitySection');
const qualityOptions = document.getElementById('qualityOptions');
const downloadLink = document.getElementById('downloadLink');

const PLATFORMS = {
  youtube: /(?:youtube\.com|youtu\.be)/i,
  tiktok: /tiktok\.com/i,
  instagram: /instagram\.com/i,
  twitter: /(?:twitter\.com|x\.com)/i,
  facebook: /(?:facebook\.com|fb\.watch)/i,
};

let currentUrl = '';
let selectedQuality = null;

urlInput.addEventListener('input', () => {
  clearBtn.classList.toggle('visible', urlInput.value.length > 0);
});

clearBtn.addEventListener('click', () => {
  urlInput.value = '';
  clearBtn.classList.remove('visible');
  hideResult();
  hideStatus();
  urlInput.focus();
});

downloadBtn.addEventListener('click', handleDownload);
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleDownload();
});

function detectPlatform(url) {
  for (const [platform, regex] of Object.entries(PLATFORMS)) {
    if (regex.test(url)) return platform;
  }
  return 'direct';
}

function showStatus(message, type = 'loading') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function hideStatus() {
  statusEl.className = 'status hidden';
}

function hideResult() {
  resultEl.classList.add('hidden');
  qualitySection.classList.add('hidden');
  qualityOptions.innerHTML = '';
}

async function handleDownload() {
  const url = urlInput.value.trim();
  if (!url) {
    showStatus('Veuillez entrer un lien.', 'error');
    return;
  }

  currentUrl = url;
  selectedQuality = null;
  hideResult();
  showStatus('Extraction en cours...', 'loading');
  downloadBtn.disabled = true;

  try {
    const response = await fetch('/.netlify/functions/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de l\'extraction.');
    }

    showStatus('Lien extrait avec succès !', 'success');

    if (data.thumbnail) {
      thumbnailEl.src = data.thumbnail;
      thumbnailEl.alt = data.title || 'Aperçu';
      thumbnailEl.style.display = 'block';
    } else {
      thumbnailEl.style.display = 'none';
    }

    titleEl.textContent = data.title || 'Média';
    authorEl.textContent = data.author || '';

    if (data.qualities && data.qualities.length > 1) {
      qualitySection.classList.remove('hidden');
      qualityOptions.innerHTML = '';
      data.qualities.forEach((q, i) => {
        const btn = document.createElement('button');
        btn.className = 'quality-btn' + (i === 0 ? ' active' : '');
        btn.textContent = q.label || q.quality || `Option ${i + 1}`;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedQuality = q;
          downloadLink.href = q.url || data.url;
        });
        qualityOptions.appendChild(btn);
      });
      selectedQuality = data.qualities[0];
      downloadLink.href = data.qualities[0].url || data.url;
    } else {
      qualitySection.classList.add('hidden');
      downloadLink.href = data.url;
    }

    resultEl.classList.remove('hidden');
  } catch (err) {
    showStatus(err.message || 'Une erreur est survenue.', 'error');
  } finally {
    downloadBtn.disabled = false;
  }
}
