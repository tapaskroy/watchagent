#!/usr/bin/env node
/**
 * Query users from production database
 * Usage: tsx scripts/query-users.ts
 */

import { db, users } from '@watchagent/database';
import { desc } from 'drizzle-orm';

async function queryUsers() {
  try {
    console.log('Querying production database...\n');

    // Get all users
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
    console.log(`\nTotal users: ${allUsers.length}`);

    // Calculate statistics
    const now = Date.now();
    const last24h = allUsers.filter(
      (u) => new Date(u.createdAt).getTime() >= now - 24 * 60 * 60 * 1000
    ).length;
    const last7d = allUsers.filter(
      (u) => new Date(u.createdAt).getTime() >= now - 7 * 24 * 60 * 60 * 1000
    ).length;
    const last30d = allUsers.filter(
      (u) => new Date(u.createdAt).getTime() >= now - 30 * 24 * 60 * 60 * 1000
    ).length;

    console.log('\n=== STATISTICS ===');
    console.log(`Total users: ${allUsers.length}`);
    console.log(`Last 24 hours: ${last24h}`);
    console.log(`Last 7 days: ${last7d}`);
    console.log(`Last 30 days: ${last30d}`);

    process.exit(0);
  } catch (error) {
    console.error('Error querying users:', error);
    process.exit(1);
  }
}

queryUsers();
