import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from '../config';
import path from 'path';

export async function runMigrations() {
  console.log('Running migrations...');
  try {
    await migrate(db, {
      migrationsFolder: path.join(__dirname, '../../migrations'),
    });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

export async function runMigrationsAndExit() {
  try {
    await runMigrations();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}
