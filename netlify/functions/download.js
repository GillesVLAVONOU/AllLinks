const { ttdl, igdl, fbdown, twitter, youtube } = require('ab-downloader');

const handlers = {
  youtube: async (url) => {
    const data = await youtube(url);
    return {
      url: data.mp4 || data.mp3 || null,
      title: data.title || 'YouTube Video',
      thumbnail: data.thumbnail || null,
      author: data.author || null,
      qualities: data.mp4 ? [
        { url: data.mp4, label: 'Vidéo (MP4)', type: 'video' },
        ...(data.mp3 ? [{ url: data.mp3, label: 'Audio (MP3)', type: 'audio' }] : []),
      ] : undefined,
    };
  },
  tiktok: async (url) => {
    const data = await ttdl(url);
    const videos = data.video || [];
    const firstVideo = videos[0];
    const videoUrl = firstVideo?.url || firstVideo;
    return {
      url: typeof videoUrl === 'string' ? videoUrl : null,
      title: data.title || 'TikTok Video',
      thumbnail: data.thumbnail || null,
      author: data.creator || null,
    };
  },
  instagram: async (url) => {
    const data = await igdl(url);
    const items = Array.isArray(data) ? data : [data];
    if (items.length > 0 && items[0].url) {
      const qualities = items.map((item, i) => ({
        url: item.url,
        label: item.type === 'video' ? `Vidéo ${i + 1}` : `Image ${i + 1}`,
        type: item.type || 'image',
      }));
      return {
        url: qualities[0].url,
        title: 'Instagram Media',
        thumbnail: items[0].thumbnail || null,
        author: null,
        qualities: qualities.length > 1 ? qualities : undefined,
      };
    }
    return { url: null, title: 'Instagram Media', thumbnail: null, author: null };
  },
  facebook: async (url) => {
    const data = await fbdown(url);
    const videoUrl = data.HD || data.Normal_video || data.SD;
    return {
      url: videoUrl,
      title: 'Facebook Video',
      thumbnail: null,
      author: null,
    };
  },
  twitter: async (url) => {
    const data = await twitter(url);
    const urls = data.url || [];
    const hdEntry = urls.find((u) => u.hd);
    const sdEntry = urls.find((u) => u.sd);
    const bestUrl = hdEntry?.hd || sdEntry?.sd || urls[0]?.hd || urls[0]?.sd;
    return {
      url: bestUrl || null,
      title: data.title || 'Twitter/X Media',
      thumbnail: data.thumb || null,
      author: null,
      qualities: urls.length > 1 ? urls.map((u) => ({
        url: u.hd || u.sd,
        label: u.hd ? 'HD' : 'SD',
        type: 'video',
      })) : undefined,
    };
  },
};

function detectPlatform(url) {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/tiktok\.com/.test(url)) return 'tiktok';
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/facebook\.com|fb\.watch/.test(url)) return 'facebook';
  if (/twitter\.com|x\.com/.test(url)) return 'twitter';
  return null;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { url } = JSON.parse(event.body || '{}');

    if (!url) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'URL requise.' }) };
    }

    const platform = detectPlatform(url);
    if (!platform) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Plateforme non supportée. Utilisez un lien YouTube, TikTok, Instagram, Twitter/X ou Facebook.' }),
      };
    }

    const handler = handlers[platform];
    const result = await handler(url);

    if (!result.url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Impossible d\'extraire le lien de téléchargement. Le contenu est peut-être privé ou indisponible.' }),
      };
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (err) {
    console.error('Download error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur lors de l\'extraction: ' + (err.message || 'erreur inconnue') }),
    };
  }
};
