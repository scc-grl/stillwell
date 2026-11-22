// Development database only. No rows, owner identifiers or health fields are logged.
// Frozen care-team snapshots are intentionally NOT mutated; their display adapter
// performs the same conversion without changing the original frozen copy.
import pg from "pg";
import { pathToFileURL } from "node:url";
export async function migrateJournalRatings(client) {
  return client.query(`
    UPDATE recovery_logs SET data = jsonb_set(data, '{dailyCheckIn}',
      (data->'dailyCheckIn') || jsonb_build_object(
        'ratingScale', 'ten_point_v1',
        'symptoms', (
          SELECT jsonb_agg(CASE
            WHEN answer->>'status'='recorded' AND answer->>'rating' IN ('0','1','2','3')
            THEN answer || jsonb_build_object('rating',
              CASE (answer->>'rating')::int WHEN 0 THEN 0 WHEN 1 THEN 3 WHEN 2 THEN 6 WHEN 3 THEN 9 END)
            ELSE answer END ORDER BY ordinal)
          FROM jsonb_array_elements(data->'dailyCheckIn'->'symptoms') WITH ORDINALITY AS items(answer, ordinal)
        )
      ))
    WHERE jsonb_typeof(data->'dailyCheckIn')='object'
      AND jsonb_typeof(data->'dailyCheckIn'->'symptoms')='array'
      AND data->'dailyCheckIn'->>'ratingScale' IS DISTINCT FROM 'ten_point_v1'
  `);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.NODE_ENV === "production") throw new Error("Run reviewed production migrations separately.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await migrateJournalRatings(client);
    await client.query("COMMIT");
    console.info(`Journal rating migration completed: ${result.rowCount} entries. Frozen snapshots unchanged.`);
  } catch {
    await client.query("ROLLBACK");
    // Never print query parameters or database errors that might include stored values.
    throw new Error("Journal rating migration failed; transaction rolled back.");
  } finally {
    client.release();
    await pool.end();
  }
}
