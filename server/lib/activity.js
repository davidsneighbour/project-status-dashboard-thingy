import db from '../db.js';

const insertStmt = db.prepare(
  `INSERT INTO activity_log (repo_id, full_name, action, detail, created_at) VALUES (?, ?, ?, ?, ?)`
);
const trimStmt = db.prepare(`
  DELETE FROM activity_log
  WHERE repo_id = ?
    AND id NOT IN (SELECT id FROM activity_log WHERE repo_id = ? ORDER BY id DESC LIMIT 200)
`);

export function logActivity(repoId, fullName, action, detail = null) {
  const created_at = new Date().toISOString();
  insertStmt.run(repoId, fullName, action, detail != null ? JSON.stringify(detail) : null, created_at);
  trimStmt.run(repoId, repoId);
}
