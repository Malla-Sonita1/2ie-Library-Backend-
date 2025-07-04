const bcrypt = require('bcrypt');
const fs = require('fs');
const saltRounds = 10;

const admins = [
  { name: 'Abdoulaye Diallo', email: 'diallo.abdoulaye@2ie.edu', password: 'admin123' },
  { name: 'Fatimata Traore', email: 'traore.fatimata@2ie.edu', password: 'admin124' },
  { name: 'Ibrahim Ouedraogo', email: 'ibrahim.ibrahim@2ie.edu', password: 'admin125' },
  { name: 'Aissata Kone', email: 'kone.aissata@2ie.edu', password: 'admin126' },
  { name: 'Moussa Cisse', email: 'cisse.moussa@2ie.edu', password: 'admin127' },
];

(async () => {
  let sql = '-- Remplissage de la table users avec des administrateurs fictifs\n';
  const hashPromises = admins.map((admin) => {
    return new Promise((resolve, reject) => {
      bcrypt.hash(admin.password, saltRounds, (err, hash) => {
        if (err) reject(err);
        else resolve(`INSERT INTO users (name, email, password, role, is_active, created_at, updated_at) VALUES ('${admin.name}', '${admin.email}', '${hash}', 'admin', true, NOW(), NOW());`);
      });
    });
  });

  try {
    const insertStatements = await Promise.all(hashPromises);
    sql += insertStatements.join('\n');
    console.log(sql); // Affiche dans la console
    if (typeof fs.writeFileSync === 'function') { // Vérifie si fs est disponible
      fs.writeFileSync('admin-data.sql', sql); // Écrit dans un fichier
      console.log('Fichier admin-data.sql généré avec succès.');
    } else {
      console.error('Module fs non disponible. Vérifiez l\'importation de fs.');
    }
  } catch (error) {
    console.error('Erreur lors du hachage ou de l\'écriture :', error);
  }
})();