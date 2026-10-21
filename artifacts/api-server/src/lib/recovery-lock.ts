export interface SqlClient {
  query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }>;
}
export interface SqlPool extends SqlClient {
  connect(): Promise<SqlClient & { release(): void }>;
}

export async function lockPatient(tx: SqlClient, patientId: string) {
  await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`patient:${patientId}`]);
}

export async function transaction<T>(pool: SqlPool, operation: (tx: SqlClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function patientWrite<T>(pool: SqlPool, id: string, operation: (tx: SqlClient) => Promise<T>) {
  return transaction(pool, async tx => {
    await lockPatient(tx, id);
    return operation(tx);
  });
}

export async function freezeLink(tx: SqlClient, linkId: string, now: Date) {
  // Call only while holding the patient's write lock.
  const { rows: [link] } = await tx.query("SELECT * FROM care_team_links WHERE id=$1 AND status='active' FOR UPDATE", [linkId]);
  if (!link) return;
  const { rows: [profile] } = await tx.query("SELECT preferences FROM recovery_profiles WHERE owner_id=$1", [link.patient_id]);
  const { rows: entries } = await tx.query("SELECT data, date::text AS date, updated_at FROM recovery_logs WHERE owner_id=$1 ORDER BY date DESC", [link.patient_id]);
  await tx.query(
    "INSERT INTO care_team_snapshots(link_id,profile_summary,entries,captured_at) VALUES($1,$2::jsonb,$3::jsonb,$4)",
    [linkId, JSON.stringify(profile?.preferences ?? {}), JSON.stringify(entries.map(e => ({ ...e.data, date: e.date, updatedAt: new Date(e.updated_at).toISOString() }))), now],
  );
  // Forget the live patient relationship. Reconnecting always creates a new link.
  await tx.query("UPDATE care_team_links SET status='former',patient_id=NULL,patient_email='',disconnected_at=$2 WHERE id=$1", [linkId, now]);
}
