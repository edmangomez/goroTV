import { db, initDatabase } from './database.js';
import { hashPassword } from '../utils/crypto.js';

export async function seedDatabase(): Promise<void> {
  initDatabase();

  const existingAdmin = db.prepare('SELECT id FROM admins LIMIT 1').get();
  if (!existingAdmin) {
    const adminUser = process.env.DEFAULT_ADMIN_USER || 'admin';
    const adminPass = process.env.DEFAULT_ADMIN_PASS || 'admin1234';
    const hashed = await hashPassword(adminPass);

    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(adminUser, hashed);
    console.log(`[Seed] Usuario administrador inicial creado: ${adminUser} / ${adminPass}`);
  }
}

// Si se ejecuta directamente vía CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => {
      console.log('[Seed] Sembrado completado.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Error en sembrado:', err);
      process.exit(1);
    });
}
