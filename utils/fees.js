// utils/fees.js
// Helpers partagés pour la grille des frais académiques.
// Règle métier : le TOTAL est toujours la somme des frais détaillés.

const DETAIL_KEYS = [
  'frais_academiques',
  'releve',
  'reinscription',
  'carte',
  'bibliotheque',
  'coordination',
  'diplome',
  'construction',
  'stage',
  'jury',
];

const TRANCHE_KEYS = ['premiere', 'deuxieme', 'troisieme'];

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const parseJsonMaybe = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  return null;
};

// Normalise un objet de détails : uniquement des nombres (ou null).
const sanitizeDetails = (input) => {
  const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const out = {};
  DETAIL_KEYS.forEach((key) => {
    out[key] = toNumberOrNull(src[key]);
  });
  return out;
};

// Normalise les tranches de paiement.
const sanitizeTranches = (input) => {
  const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const out = {};
  TRANCHE_KEYS.forEach((key) => {
    out[key] = toNumberOrNull(src[key]);
  });
  return out;
};

// Le total = somme de tous les frais détaillés (null => 0).
const computeTotal = (details) => {
  const src = details && typeof details === 'object' && !Array.isArray(details) ? details : {};
  return DETAIL_KEYS.reduce((sum, key) => {
    const n = toNumberOrNull(src[key]);
    return sum + (n === null ? 0 : n);
  }, 0);
};

// Convertit une ligne Sequelize en objet exploitable par le front.
const toApiFee = (row, index = 0) => {
  const raw = row && typeof row.toJSON === 'function' ? row.toJSON() : { ...(row || {}) };
  const details = sanitizeDetails(parseJsonMaybe(raw.detailsFrais));
  const tranches = sanitizeTranches(parseJsonMaybe(raw.tranches));
  return {
    id: raw.id ?? null,
    key: raw.id ?? index + 1,
    promotion: raw.promotion ?? '',
    faculte: raw.faculte ?? '',
    details_frais: details,
    total: computeTotal(details),
    tranches,
    academicYear: raw.academicYear ?? null,
  };
};

module.exports = {
  DETAIL_KEYS,
  TRANCHE_KEYS,
  sanitizeDetails,
  sanitizeTranches,
  computeTotal,
  toApiFee,
};
