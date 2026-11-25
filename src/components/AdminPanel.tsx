import { useEffect, useState } from 'react';
import { backend } from '../backend';
import type { AdminOverview, AdminReport } from '../backend/types';

/** Moderation view, shown on the home screen to admin accounts only. */
export function AdminPanel() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [o, r] = await Promise.all([backend.adminOverview(), backend.adminReports()]);
        if (!alive) return;
        setOverview(o);
        setReports(r);
        setError('');
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    };
    void load();
    const t = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const stats: [string, number | undefined][] = [
    ['players', overview?.players],
    ['women', overview?.women],
    ['men', overview?.men],
    ['drinks shared', overview?.drinks_accepted],
    ['dates', overview?.dates],
    ['reports', overview?.reports],
  ];

  return (
    <div className="panel glass admin">
      <div className="row gap">
        <h3>Admin</h3>
        <span className="pill pink">Only you can see this</span>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="admin-stats">
        {stats.map(([label, n]) => (
          <div key={label}>
            <b>{n ?? '–'}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <h3>Reports</h3>
      {reports.length === 0 ? (
        <p className="muted small">No reports yet.</p>
      ) : (
        <div className="report-list">
          {reports.map((r) => (
            <div key={r.id} className="report-row">
              <div className="small muted">
                {new Date(r.created_at).toLocaleString()} · <b>{r.reporter_name ?? 'Deleted player'}</b> reported{' '}
                <b>{r.reported_name ?? 'a deleted player'}</b>
              </div>
              <div>{r.reason}</div>
              <div className="small muted">Player ID: {r.reported_id}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
