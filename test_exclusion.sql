-- Check what's actually in the excluded content list
SELECT
  u.email,
  u.id as user_id,
  up.learned_preferences->'excludedContent' as excluded_content,
  jsonb_array_length(up.learned_preferences->'excludedContent') as excluded_count
FROM users u
LEFT JOIN user_preferences up ON u.id = up.user_id
WHERE u.email LIKE '%tapas%' OR u.email LIKE '%example%'
LIMIT 5;

-- Check recommendations structure
SELECT
  r.id as rec_id,
  r.content_id,
  c.id as content_table_id,
  c.title,
  r.user_id
FROM recommendations r
JOIN content c ON r.content_id = c.id
WHERE r.user_id = '44e2f701-f63a-437c-935e-232573992b85'
LIMIT 5;
