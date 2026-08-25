/**
 * Test-data writes that can only be undone one row at a time.
 *
 * The rule: a script may delete rows it created, and nothing else. Never a bare
 * delete on a table, and never a delete scoped by a predicate that could match
 * somebody else's row.
 *
 * Enforced by shape rather than by discipline. `cleanup()` iterates a list of
 * primary keys this helper handed out, so there is no way to express "delete
 * everything in requests" through it — the same reasoning as AD-20 and AD-24,
 * applied to test fixtures instead of to reads.
 *
 * When a predicate-scoped delete IS acceptable:
 *   - the predicate names a THROWAWAY identity the script itself created (a
 *     probe user), so every row matching it is script-created by construction;
 *   - or the script has declared ownership of those identities, as seed.mjs
 *     does for its 32 fixtures.
 *
 * When it is not:
 *   - the predicate names a real or shared identity. `delete().eq("from_user_id",
 *     testOne.id)` looks scoped and is not: it will happily remove a declined
 *     request from last week that F4.6 deliberately left behind.
 */
export function trackedWrites(admin) {
  /** @type {{ table: string, id: string }[]} */
  const created = [];

  return {
    /** Insert a row and remember its primary key. */
    async insert(table, row) {
      const { data, error } = await admin.from(table).insert(row).select("id").single();
      if (error) throw new Error(`tracked insert into ${table}: ${error.message}`);
      created.push({ table, id: data.id });
      return data.id;
    },

    /** Forget a row without deleting it — for rows removed another way. */
    forget(id) {
      const i = created.findIndex((r) => r.id === id);
      if (i >= 0) created.splice(i, 1);
    },

    /**
     * Delete exactly the rows this helper inserted, by primary key, most
     * recent first so children go before parents.
     */
    async cleanup() {
      let removed = 0;
      for (const { table, id } of [...created].reverse()) {
        const { error } = await admin.from(table).delete().eq("id", id);
        if (error) throw new Error(`tracked cleanup ${table}/${id}: ${error.message}`);
        removed++;
      }
      created.length = 0;
      return removed;
    },

    get outstanding() {
      return created.length;
    },
  };
}
