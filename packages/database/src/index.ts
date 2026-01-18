// Export everything from schema
export * from './schema';

// Export database configuration and connection
export { db, pool, testConnection, closeDatabase, healthCheck, dbConfig } from './config';

// Export migration utilities (will be created)
export * from './migrations';
