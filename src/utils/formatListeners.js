/**
 * Utilitaire robuste de formatage des statistiques d'auditeurs et d'écoutes.
 * Garantit qu'aucune valeur NaN / undefined / null ne soit injectée dans l'interface.
 */

/**
 * Extrait un nombre entier sécurisé à partir de n'importe quelle valeur brute
 * (number, string avec 'M', 'k', 'auditeurs', undefined, null, etc.)
 * @param {any} value - Valeur brute renvoyée par l'API ou le state
 * @returns {number} Nombre valide >= 0
 */
export function parseListenersCount(value) {
  if (value === null || value === undefined || value === '') return 0;
  
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? 0 : Math.max(0, Math.round(value));
  }

  if (typeof value === 'string') {
    const cleanStr = value.trim();
    if (!cleanStr || cleanStr.toLowerCase() === 'artiste' || cleanStr.toLowerCase() === 'nan') {
      return 0;
    }

    // Gestion des formats comme "22.5M", "1.8M", "450k", "1 234 567"
    const millionMatch = cleanStr.match(/([\d.,]+)\s*M/i);
    if (millionMatch) {
      const num = parseFloat(millionMatch[1].replace(',', '.'));
      return isNaN(num) ? 0 : Math.round(num * 1000000);
    }

    const thousandMatch = cleanStr.match(/([\d.,]+)\s*k/i);
    if (thousandMatch) {
      const num = parseFloat(thousandMatch[1].replace(',', '.'));
      return isNaN(num) ? 0 : Math.round(num * 1000);
    }

    // Retirer tous les caractères non numériques sauf chiffres
    const digitsOnly = cleanStr.replace(/[^\d]/g, '');
    if (digitsOnly) {
      const parsed = parseInt(digitsOnly, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
  }

  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? 0 : Math.max(0, Math.round(num));
}

/**
 * Formate le nombre d'auditeurs de façon complète avec séparateurs français (ex: "1 234 567 auditeurs par mois")
 * @param {any} value - Valeur brute
 * @param {Object} options - Options de configuration
 * @returns {string} Chaîne formatée
 */
export function formatListeners(value, options = {}) {
  const {
    suffix = ' auditeurs par mois',
    singularSuffix = ' auditeur par mois',
    fallback = '0 auditeur par mois',
    compact = false
  } = options;

  const count = parseListenersCount(value);
  
  if (count <= 0) {
    return fallback;
  }

  if (compact) {
    if (count >= 1000000) {
      const formattedM = (count / 1000000).toLocaleString('fr-FR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });
      return `${formattedM}M auditeurs`;
    }
    if (count >= 1000) {
      const formattedK = Math.round(count / 1000).toLocaleString('fr-FR');
      return `${formattedK} k auditeurs`;
    }
  }

  const formattedNum = new Intl.NumberFormat('fr-FR').format(count);
  const finalSuffix = count === 1 ? singularSuffix : suffix;
  return `${formattedNum}${finalSuffix}`;
}

/**
 * Formate le nombre d'auditeurs court / compact (ex: "22,5M auditeurs")
 * @param {any} value - Valeur brute
 * @returns {string}
 */
export function formatListenersShort(value) {
  return formatListeners(value, {
    compact: true,
    suffix: ' auditeurs',
    singularSuffix: ' auditeur',
    fallback: '0 auditeur'
  });
}

/**
 * Formate le nombre brut d'écoutes / streams pour un titre (ex: "1 450 200 écoutes" ou "1 450 200")
 * @param {any} value - Valeur brute d'écoutes ou popularité
 * @param {boolean} withSuffix - Inclure le suffixe "écoutes"
 * @returns {string}
 */
export function formatPlayCount(value, withSuffix = false) {
  const count = parseListenersCount(value);
  if (count <= 0) return withSuffix ? '0 écoute' : '0';

  const formatted = new Intl.NumberFormat('fr-FR').format(count);
  if (!withSuffix) return formatted;
  return `${formatted} écoute${count > 1 ? 's' : ''}`;
}
