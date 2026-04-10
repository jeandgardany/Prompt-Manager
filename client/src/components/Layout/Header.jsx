import { useLocation, Link } from 'react-router-dom';

export default function Header({ agentName, promptName }) {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);

  const buildBreadcrumbs = () => {
    const crumbs = [{ label: 'Dashboard', path: '/' }];

    if (agentName) {
      crumbs.push({ label: agentName, path: location.pathname.includes('/prompt/') ? `/agent/${parts[1]}` : null });
    }
    if (promptName) {
      crumbs.push({ label: promptName, path: null });
    }

    return crumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  return (
    <header className="header">
      <nav className="header-breadcrumb">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <span className="separator">›</span>}
            {crumb.path ? (
              <Link to={crumb.path} style={{ color: 'var(--text-secondary)' }}>{crumb.label}</Link>
            ) : (
              <span className="current">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="header-actions">
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>v1.0</span>
      </div>
    </header>
  );
}
