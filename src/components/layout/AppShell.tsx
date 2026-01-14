/**
 * App shell layout with mobile-first navigation
 */

import { Outlet, NavLink, Link } from 'react-router-dom';
import styles from './Layout.module.css';

export function AppShell() {
  return (
    <div className={styles.appShell}>
      <header className={styles.header}>
        <h1 className={styles.title}>Quick Data Viz</h1>
        <Link to="/settings" className={styles.headerButton} aria-label="Settings">
          <span className={styles.settingsIcon}>&#x2699;</span>
        </Link>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={styles.bottomNav}>
        <NavLink
          to="/"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
          }
        >
          <span className={styles.navIcon}>+</span>
          <span className={styles.navLabel}>Build</span>
        </NavLink>
        <NavLink
          to="/chart"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
          }
        >
          <span className={styles.navIcon}>&#x1F4CA;</span>
          <span className={styles.navLabel}>Chart</span>
        </NavLink>
        <NavLink
          to="/datasets"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
          }
        >
          <span className={styles.navIcon}>&#x1F4D1;</span>
          <span className={styles.navLabel}>Data</span>
        </NavLink>
        <NavLink
          to="/saved"
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
          }
        >
          <span className={styles.navIcon}>&#x2B50;</span>
          <span className={styles.navLabel}>Saved</span>
        </NavLink>
      </nav>
    </div>
  );
}
