import { saveEntity, getEntities } from './db.js';
import { initialSeedData } from './seedData.js';
import { fileURLToPath } from 'url';

export async function seedDatabase() {
  for (const [entityName, records] of Object.entries(initialSeedData)) {
    const existing = await getEntities(entityName);
    if (existing.length === 0) {
      console.log(`Seeding initial ${entityName} (${records.length} records)...`);
      for (const record of records) {
        await saveEntity(entityName, record);
      }
    }
  }
  console.log('Database seeding complete.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

