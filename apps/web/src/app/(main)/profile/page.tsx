'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { preferencesApi } from '@watchagent/api-client';
import { Container, Loading, Button, Grid, ContentCard } from '@watchagent/ui';
import { useRouter } from 'next/navigation';
import type { ContentCard as ContentCardType } from '@watchagent/shared';

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [preferencesText, setPreferencesText] = useState('');
  const [isEditingLearned, setIsEditingLearned] = useState(false);
  const [learnedPrefsText, setLearnedPrefsText] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => preferencesApi.getUserProfile(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => preferencesApi.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setIsEditing(false);
      setIsEditingLearned(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleEdit = () => {
    setPreferencesText(profile?.preferences.viewingPreferencesText || '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setPreferencesText('');
  };

  const handleSave = () => {
    updateMutation.mutate({ viewingPreferencesText: preferencesText });
  };

  const handleEditLearned = () => {
    setLearnedPrefsText(JSON.stringify(profile?.preferences.learnedPreferences || {}, null, 2));
    setIsEditingLearned(true);
  };

  const handleCancelLearned = () => {
    setIsEditingLearned(false);
    setLearnedPrefsText('');
  };

  const handleSaveLearned = () => {
    try {
      const parsed = JSON.parse(learnedPrefsText);
      updateMutation.mutate({ learnedPreferences: parsed });
      setIsEditingLearned(false);
    } catch (error) {
      alert('Invalid JSON format. Please check your input.');
    }
  };

  const handleContentSelect = (content: ContentCardType) => {
    router.push(`/content/${content.tmdbId}?type=${content.type}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Container className="py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </Container>
    );
  }

  return (
    <div className="py-8">
      <Container>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-semibold">
              {profile.user.username[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-text-primary">
                {profile.user.username}
              </h1>
              {profile.user.fullName && (
                <p className="text-text-secondary">{profile.user.fullName}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 p-6 bg-background-card rounded-lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {profile.stats.totalRatings}
              </div>
              <div className="text-sm text-text-secondary">Ratings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {profile.stats.totalWatchlistItems}
              </div>
              <div className="text-sm text-text-secondary">Watchlist Items</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {profile.stats.averageRating.toFixed(1)}
              </div>
              <div className="text-sm text-text-secondary">Avg Rating</div>
            </div>
          </div>
        </div>

        {/* Viewing Preferences */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-display font-bold text-text-primary">
              Your Viewing Preferences
            </h2>
            {!isEditing && (
              <Button variant="secondary" size="sm" onClick={handleEdit}>
                Edit
              </Button>
            )}
          </div>

          <div className="bg-background-card rounded-lg p-6">
            {isEditing ? (
              <div>
                <textarea
                  value={preferencesText}
                  onChange={(e) => setPreferencesText(e.target.value)}
                  placeholder="Describe your viewing preferences... (e.g., I love sci-fi movies with complex plots, especially Christopher Nolan films. I prefer thought-provoking content over action. I enjoy psychological thrillers and dislike rom-coms.)"
                  className="w-full h-40 px-4 py-3 bg-background-dark text-text-primary rounded-lg border border-gray-700 focus:border-primary focus:outline-none resize-none"
                  maxLength={5000}
                />
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-text-secondary">
                    {preferencesText.length} / 5000 characters
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancel}
                      disabled={updateMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSave}
                      isLoading={updateMutation.isPending}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {profile.preferences.viewingPreferencesText ? (
                  <p className="text-text-primary leading-relaxed whitespace-pre-wrap">
                    {profile.preferences.viewingPreferencesText}
                  </p>
                ) : (
                  <p className="text-text-secondary italic">
                    No viewing preferences set. Click "Edit" to describe your taste.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Learned Preferences from Conversations */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-display font-bold text-text-primary">
              What WatchAgent Learned From Your Conversations
            </h2>
            {!isEditingLearned && (
              <Button variant="secondary" size="sm" onClick={handleEditLearned}>
                Edit
              </Button>
            )}
          </div>

          <div className="bg-background-card rounded-lg p-6">
            {isEditingLearned ? (
              <div>
                <p className="text-sm text-text-secondary mb-2">
                  Edit the JSON below to modify what WatchAgent has learned from your conversations:
                </p>
                <textarea
                  value={learnedPrefsText}
                  onChange={(e) => setLearnedPrefsText(e.target.value)}
                  className="w-full h-64 px-4 py-3 bg-background-dark text-text-primary rounded-lg border border-gray-700 focus:border-primary focus:outline-none resize-none font-mono text-sm"
                />
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelLearned}
                    disabled={updateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveLearned}
                    isLoading={updateMutation.isPending}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {profile.preferences.learnedPreferences &&
                 Object.keys(profile.preferences.learnedPreferences).length > 0 ? (
                  <div className="space-y-4">
                    {profile.preferences.learnedPreferences.favoriteGenres &&
                     profile.preferences.learnedPreferences.favoriteGenres.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-text-secondary mb-2">
                          Favorite Genres:
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.preferences.learnedPreferences.favoriteGenres.map((genre, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.preferences.learnedPreferences.favoriteActors &&
                     profile.preferences.learnedPreferences.favoriteActors.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-text-secondary mb-2">
                          Favorite Actors:
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.preferences.learnedPreferences.favoriteActors.map((actor, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm"
                            >
                              {actor}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.preferences.learnedPreferences.favoriteMovies &&
                     profile.preferences.learnedPreferences.favoriteMovies.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-text-secondary mb-2">
                          Favorite Movies/Shows:
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.preferences.learnedPreferences.favoriteMovies.map((movie, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm"
                            >
                              {movie}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.preferences.learnedPreferences.dislikes &&
                     profile.preferences.learnedPreferences.dislikes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-text-secondary mb-2">
                          Dislikes:
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.preferences.learnedPreferences.dislikes.map((dislike, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm"
                            >
                              {dislike}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-text-secondary italic">
                    WatchAgent hasn't learned any preferences from conversations yet. Chat with
                    WatchAgent to help it understand your taste!
                  </p>
                )}
              </div>
            )}

            {saveSuccess && (
              <div className="mt-4 p-3 bg-green-900/20 border border-green-500 rounded-lg text-green-400 text-sm">
                Preferences saved successfully! WatchAgent will use this to provide better
                recommendations.
              </div>
            )}
          </div>
        </section>

        {/* Liked Content */}
        {profile.likedContent.length > 0 && (
          <section>
            <h2 className="text-2xl font-display font-bold text-text-primary mb-6">
              Movies & Shows You Loved (Rated 7+)
            </h2>
            <Grid cols={5} gap={6}>
              {profile.likedContent.map((item) => (
                <ContentCard
                  key={item.id}
                  content={{
                    id: item.id,
                    tmdbId: item.tmdbId,
                    type: item.type,
                    title: item.title,
                    posterPath: item.posterPath,
                    releaseDate: item.releaseDate,
                    tmdbRating: item.rating,
                    userRating: item.userRating,
                    genres: [],
                    inWatchlist: false,
                  }}
                  onSelect={handleContentSelect}
                />
              ))}
            </Grid>
          </section>
        )}

        {profile.likedContent.length === 0 && (
          <section className="text-center py-12">
            <p className="text-text-secondary mb-4">
              You haven't rated any content yet. Start rating movies and shows to help
              WatchAgent learn your preferences!
            </p>
            <Button variant="primary" onClick={() => router.push('/browse')}>
              Browse Content
            </Button>
          </section>
        )}
      </Container>
    </div>
  );
}
