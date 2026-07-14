import Skeleton from './Skeleton';

export default function SkeletonDashboard() {
  return (
    <>
      <section className="panel dashboard skeleton-panel" aria-hidden="true">
        <div className="panel-head">
          <Skeleton className="skel-title" style={{ width: '320px', height: '2rem', marginBottom: '0.5rem' }} />
          <Skeleton className="skel-text" style={{ width: '180px', height: '1.2rem' }} />
          <div className="dashboard-tools" style={{ marginTop: '1rem' }}>
            <Skeleton className="skel-btn" style={{ width: '160px', height: '36px', borderRadius: '999px' }} />
            <Skeleton className="skel-text" style={{ width: '120px', height: '1rem' }} />
          </div>
        </div>

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <article className="kpi-card aqi" style={{ gridColumn: 'span 1' }}>
            <Skeleton className="skel-text" style={{ width: '80px', height: '1rem', marginBottom: '1rem' }} />
            <Skeleton className="skel-title" style={{ width: '100px', height: '2.5rem', marginBottom: '0.5rem' }} />
            <Skeleton className="skel-text" style={{ width: '140px', height: '1.2rem', marginBottom: '1rem' }} />
            <Skeleton className="skel-badge" style={{ width: '160px', height: '1.5rem', borderRadius: '999px' }} />
          </article>

          <article className="kpi-card chart-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
            <Skeleton className="skel-text" style={{ width: '200px', height: '1.2rem', marginBottom: '0.5rem' }} />
            <Skeleton className="skel-text" style={{ width: '350px', height: '1rem', marginBottom: '1rem' }} />
            <div style={{ flex: 1, minHeight: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
               <Skeleton className="skel-circle" style={{ width: '180px', height: '180px', borderRadius: '50%' }} />
            </div>
          </article>
        </div>

        <div className="chart-grid">
          <article className="chart-card">
            <Skeleton className="skel-title" style={{ width: '140px', height: '1.2rem', marginBottom: '1.5rem' }} />
            <Skeleton className="skel-chart" style={{ width: '100%', height: '250px' }} />
          </article>

          <article className="chart-card">
            <Skeleton className="skel-title" style={{ width: '220px', height: '1.2rem', marginBottom: '1.5rem' }} />
            <Skeleton className="skel-chart" style={{ width: '100%', height: '250px' }} />
          </article>
        </div>
      </section>

      <section className="panel skeleton-panel" aria-hidden="true">
        <div className="panel-head">
          <Skeleton className="skel-title" style={{ width: '280px', height: '1.8rem', marginBottom: '0.5rem' }} />
          <Skeleton className="skel-text" style={{ width: '240px', height: '1.2rem' }} />
        </div>
        <div className="map-wrap">
          <Skeleton className="skel-map" style={{ width: '100%', height: '100%' }} />
        </div>
        <div className="hotspots">
          <Skeleton className="skel-title" style={{ width: '220px', height: '1.2rem', marginBottom: '0.5rem' }} />
          <ul>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.55rem 0', borderBottom: '1px solid var(--line)' }}>
              <Skeleton className="skel-text" style={{ width: '140px', height: '1rem' }} />
              <Skeleton className="skel-text" style={{ width: '60px', height: '1rem' }} />
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.55rem 0', borderBottom: '1px solid var(--line)' }}>
              <Skeleton className="skel-text" style={{ width: '120px', height: '1rem' }} />
              <Skeleton className="skel-text" style={{ width: '60px', height: '1rem' }} />
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.55rem 0' }}>
              <Skeleton className="skel-text" style={{ width: '160px', height: '1rem' }} />
              <Skeleton className="skel-text" style={{ width: '60px', height: '1rem' }} />
            </li>
          </ul>
        </div>
      </section>

      <section className="panel skeleton-panel" aria-hidden="true">
        <div className="panel-head">
          <Skeleton className="skel-title" style={{ width: '240px', height: '1.8rem', marginBottom: '0.5rem' }} />
          <Skeleton className="skel-text" style={{ width: '280px', height: '1.2rem' }} />
        </div>
        <div className="exposure-card">
          <Skeleton className="skel-title" style={{ width: '120px', height: '1rem', marginBottom: '0.5rem' }} />
          <Skeleton className="skel-text" style={{ width: '80%', height: '1.5rem', marginBottom: '0.5rem' }} />
          <Skeleton className="skel-text" style={{ width: '180px', height: '1rem' }} />
        </div>
        <ul className="warnings">
           <li style={{ padding: '0.5rem 0.75rem', marginBottom: '0.5rem', borderRadius: 'var(--r-sm)' }}>
             <Skeleton className="skel-text" style={{ width: '90%', height: '1.2rem' }} />
           </li>
           <li style={{ padding: '0.5rem 0.75rem', marginBottom: '0.5rem', borderRadius: 'var(--r-sm)' }}>
             <Skeleton className="skel-text" style={{ width: '70%', height: '1.2rem' }} />
           </li>
        </ul>
      </section>
    </>
  );
}
