const ytdl = require('@distube/ytdl-core');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing ID' });

  try {
    const info = await ytdl.getInfo(id);
    const format = ytdl.chooseFormat(info.formats, {
      filter: 'audioonly',
      quality: 'highestaudio'
    });

    if (!format) return res.status(404).json({ error: 'No audio found' });

    // On renvoie juste l'URL et les métadonnées
    // Note: Cette URL peut expirer ou être bloquée par IP sur Safari, 
    // c'est pourquoi le hook utilise Piped en priorité.
    res.status(200).json({
      url: format.url,
      mimeType: format.mimeType,
      contentLength: format.contentLength
    });

  } catch (error) {
    console.error('[API Error]', error);
    res.status(500).json({ error: 'Failed to get stream URL' });
  }
};
