function safeDecodeURI(str) {
  try { return decodeURIComponent(str); } catch { return str; }
}
function getMainArtistName(artistName) {
  if (!artistName || typeof artistName !== 'string') return '';
  let clean = artistName.split(/ feat\. | ft\. | featuring | x | & | vs\. /i)[0].trim();
  clean = clean.split(' - ')[0].trim();
  return clean;
}
function normalizeArtistKey(name) {
  if (!name || typeof name !== 'string') return '';
  const decoded = safeDecodeURI(name);
  const mainName = getMainArtistName(decoded);
  return mainName
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\(\[\{].*?[\)\]\}]/g, '') // Supprime les parenthèses (feat...), (Live)
    .replace(/^(the\s+|les\s+|le\s+|la\s+|l')/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}
function isArtistMatch(candidate, artistName) {
  if (!candidate || !artistName) return false;
  const targetMain = getMainArtistName(safeDecodeURI(artistName));
  const targetKey = normalizeArtistKey(targetMain);
  if (!targetKey) return false;
  const decodedCand = safeDecodeURI(candidate);
  const candParts = decodedCand
    .split(/\s+(?:ft\.?|feat\.?|featuring|with|x|&|vs\.?)\s+|,|\(/i)
    .map(p => p.replace(/[\)\}\]]/g, '').trim())
    .filter(Boolean);
  for (const part of candParts) {
    const partKey = normalizeArtistKey(part);
    if (partKey === targetKey) return true;
  }
  const candKey = normalizeArtistKey(decodedCand);
  if (candKey && targetKey && (candKey.includes(targetKey) || targetKey.includes(candKey))) {
    return true;
  }
  return false;
}
console.log(isArtistMatch("Stromae", "Paul Kalkbrenner"));
