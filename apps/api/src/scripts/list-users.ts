/**
 * List all users - run this as a one-off script
 * Usage: tsx apps/api/src/scripts/list-users.ts
 */
import { db, users } from '@watchagent/database';
import { desc } from 'drizzle-orm';

async function listUsers() {
  try {
    console.log('Fetching all users from database...\n');

    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    console.log('=== ALL USERS ===');
    console.log(JSON.stringify(allUsers, null, 2));

    // Statistics
    const now = Date.now();
    const last24h = allUsers.filter(u => new Date(u.createdAt).getTime() >= now - 24 * 60 * 60 * 1000).length;
    const last7d = allUsers.filter(u => new Date(u.createdAt).getTime() >= now - 7 * 24 * 60 * 60 * 1000).length;
    const last30d = allUsers.filter(u => new Date(u.createdAt).getTime() >= now - 30 * 24 * 60 * 60 * 1000).length;

    console.log('\n=== STATISTICS ===');
    console.log(JSON.stringify({
      total: allUsers.length,
      last24Hours: last24h,
      last7Days: last7d,
      last30Days: last30d,
    }, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listUsers();
