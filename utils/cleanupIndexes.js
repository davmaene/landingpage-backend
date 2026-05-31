/**
 * cleanupIndexes.js
 *
 * Supprime les index orphelins / en doublon sur chaque table avant le sync Sequelize.
 * MySQL autorise au maximum 64 index par table. Sequelize (alter:true) en crée de
 * nouveaux à chaque redémarrage si les noms auto-générés diffèrent des noms attendus,
 * ce qui fait exploser le compteur.
 *
 * Ce script ne conserve que :
 *   - PRIMARY  (clé primaire)
 *   - les index dont le nom est explicitement déclaré dans les modèles (KEPT_INDEXES)
 *
 * Tous les autres index sont supprimés avant le sequelize.sync().
 */

// Index que les modèles déclarent explicitement (à maintenir à jour si on en ajoute)
const KEPT_INDEXES = {
  users:                 new Set(['users_email_unique']),
  faculties:             new Set(['faculties_slug_unique']),
  newsletters:           new Set(['newsletters_email_unique']),
  password_reset_tokens: new Set(['prt_token_unique']),
  centers:               new Set(['centers_slug_unique']),
  staff_members:         new Set(['staff_members_slug_unique']),
  special_programs:      new Set(['special_programs_slug_unique']),
};

/**
 * @param {import('sequelize').Sequelize} sequelize
 */
async function cleanupIndexes(sequelize) {
  const qi = sequelize.getQueryInterface();

  for (const [table, kept] of Object.entries(KEPT_INDEXES)) {
    let rows;
    try {
      [rows] = await sequelize.query(`SHOW INDEX FROM \`${table}\``);
    } catch {
      // La table n'existe pas encore — on passe
      continue;
    }

    // Regrouper les noms d'index uniques (chaque colonne multi-col a plusieurs lignes)
    const allIndexNames = [...new Set(rows.map((r) => r.Key_name))];

    for (const indexName of allIndexNames) {
      if (indexName === 'PRIMARY') continue;   // jamais toucher la PK
      if (kept.has(indexName)) continue;       // index attendu → on garde

      // Index orphelin ou doublon → on le supprime
      try {
        await sequelize.query(`ALTER TABLE \`${table}\` DROP INDEX \`${indexName}\``);
        console.log(`[ CLEANUP ] Dropped orphan index "${indexName}" on "${table}"`);
      } catch (err) {
        // Si l'index a déjà été supprimé entre temps, on ignore silencieusement
        console.warn(`[ CLEANUP ] Could not drop "${indexName}" on "${table}": ${err.message}`);
      }
    }
  }
}

module.exports = { cleanupIndexes };
