#!/usr/bin/env node
import { db } from '../config';
import { users, userPreferences, content } from '../schema';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('Seeding database...');

  try {
    // Create test user
    const passwordHash = await bcrypt.hash('password123', 12);
    const [user] = await db
      .insert(users)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash,
        fullName: 'Test User',
        bio: 'A test user for development',
        emailVerified: true,
      })
      .returning();

    console.log('Created test user:', user.username);

    // Create user preferences
    await db.insert(userPreferences).values({
      userId: user.id,
      preferredGenres: [28, 12, 878], // Action, Adventure, Sci-Fi
      favoriteActors: ['Tom Hanks', 'Meryl Streep'],
      preferredLanguages: ['en'],
      contentTypes: ['movie', 'tv'],
    });

    console.log('Created user preferences');

    // Add some sample content (you would normally fetch this from TMDB)
    await db.insert(content).values([
      {
        tmdbId: '550',
        imdbId: 'tt0137523',
        type: 'movie',
        title: 'Fight Club',
        originalTitle: 'Fight Club',
        overview: 'A ticking-time-bomb insomniac and a slippery soap salesman...',
        releaseDate: '1999-10-15',
        runtime: 139,
        genres: [{ id: 18, name: 'Drama' }],
        tmdbRating: '8.4',
        language: 'en',
      },
      {
        tmdbId: '238',
        imdbId: 'tt0068646',
        type: 'movie',
        title: 'The Godfather',
        originalTitle: 'The Godfather',
        overview: 'Spanning the years 1945 to 1955, a chronicle of the...',
        releaseDate: '1972-03-14',
        runtime: 175,
        genres: [
          { id: 18, name: 'Drama' },
          { id: 80, name: 'Crime' },
        ],
        tmdbRating: '8.7',
        language: 'en',
      },
    ]);

    console.log('Seeded sample content');
    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
