import { lazy, Suspense, useEffect, useState, useRef } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Bell,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  Dumbbell,
  LayoutDashboard,
  Leaf,
  Menu,
  Settings,
  Sprout,
  Sun,
  Moon,
  X,
} from "lucide-react";
import { Provider, t, useStore } from "./lib";
import { PageTransition, Skeleton } from "./components/motion";
import Dashboard from "./Dashboard";
const Pages = lazy(() => import("./Pages"));
const paths = ["/", "/training", "/voeding", "/voortgang"];
const icons = [LayoutDashboard, Dumbbell, Leaf, ChartNoAxesCombined];
function Shell() {
  const location = useLocation();
  const { user, booting, notify } = useStore();
  const [menu, setMenu] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menu) return;
    const previous = document.activeElement as HTMLElement | null;
    const sidebar = sidebarRef.current;
    sidebar?.querySelector<HTMLButtonElement>(".mobile-close")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenu(false);
        return;
      }
      if (event.key !== "Tab" || !sidebar) return;
      const elements = [
        ...sidebar.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex="0"]',
        ),
      ].filter((el) => el.offsetParent !== null);
      const first = elements[0],
        last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [menu]);
  const [dark, setDark] = useState(
    () => localStorage.getItem("sterk-theme") === "dark",
  );
  useEffect(() => {
    document.body.classList.toggle("dark", dark);
    localStorage.setItem("sterk-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    setMenu(false);
  }, [location.pathname]);
  const standalone = [
    "/welkom",
    "/login",
    "/register",
    "/forgot",
    "/reset",
    "/verify",
  ].includes(location.pathname);
  if (standalone)
    return (
      <Suspense fallback={<Skeleton />}>
        <Pages />
      </Suspense>
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t.overview}
      </a>
      <aside
        ref={sidebarRef}
        className={`sidebar ${menu ? "open" : ""}`}
        role={menu ? "dialog" : undefined}
        aria-modal={menu ? true : undefined}
        aria-label={t.navigation[0]}
      >
        <Link className="logo" to="/welkom">
          <span className="logo-mark">
            <Sprout size={25} />
          </span>
          {t.brand}
          <span className="logo-dot">.</span>
        </Link>
        <button
          className="mobile-close icon-button"
          onClick={() => setMenu(false)}
          aria-label={t.close}
        >
          <X />
        </button>
        <div className="workspace-label">{t.copy["personal_coaching"]}</div>
        <nav>
          {paths.map((path, i) => {
            const Icon = icons[i];
            return (
              <NavLink end={path === "/"} key={path} to={path}>
                <Icon size={19} />
                <span>{t.navigation[i]}</span>
                {i === 0 && <span className="nav-dot" />}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-divider" />
        <span className="nav-label">{t.account}</span>
        <nav>
          <NavLink to="/profiel">
            <Settings size={19} />
            {t.settings}
          </NavLink>
          {user?.role === "admin" && (
            <NavLink to="/admin">
              <LayoutDashboard size={19} />
              {t.admin}
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-box">
            <span className="help-icon">
              <CircleHelp size={20} />
            </span>
            <h3>{t.support}</h3>
            <p>{t.supportText}</p>
            <Link to="/welkom">
              {t.how} <ArrowUpRight size={14} />
            </Link>
          </div>
          <Link className="user" to={user ? "/profiel" : "/login"}>
            <div className="avatar">{user?.name[0] ?? "J"}</div>
            <div>
              <strong>{user?.name ?? t.copy.accountName}</strong>
              <small>{user ? t.copy.personalProfile : t.demo}</small>
            </div>
            <ChevronDown size={15} />
          </Link>
        </div>
      </aside>
      {menu && (
        <button
          className="nav-backdrop"
          onClick={() => setMenu(false)}
          aria-label={t.close}
        />
      )}
      <div className="app-body">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label={t.navigation[0]}
              onClick={() => setMenu(!menu)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb-brand">{t.copy["mijn_omgeving"]}</span>
            <span className="slash">/</span>
            <strong>
              {paths.includes(location.pathname)
                ? t.navigation[paths.indexOf(location.pathname)]
                : location.pathname === "/intake"
                  ? t.startIntake
                  : t.settings}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="today-date">
              {new Intl.DateTimeFormat("nl-NL", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "Europe/Amsterdam",
              }).format(new Date())}
            </span>
            <button
              className="icon-button"
              aria-label={t.theme}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-button notification"
              aria-label={t.copy["meldingen"]}
              onClick={() => notify(t.copy.noNotifications)}
            >
              <Bell size={19} />
              <i />
            </button>
            <Link className="avatar small" to={user ? "/profiel" : "/login"}>
              {user?.name[0] ?? "J"}
            </Link>
          </div>
        </header>
        <main id="main" className="content">
          {booting ? (
            <Skeleton />
          ) : (
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                {location.pathname === "/" ? (
                  <Dashboard />
                ) : (
                  <Suspense fallback={<Skeleton />}>
                    <Routes location={location}>
                      <Route path="/training" element={<Pages />} />
                      <Route path="/voeding" element={<Pages />} />
                      <Route path="/voortgang" element={<Pages />} />
                      <Route path="/profiel" element={<Pages />} />
                      <Route
                        path="/intake"
                        element={
                          user ? <Pages /> : <Navigate to="/register" replace />
                        }
                      />
                      <Route
                        path="/admin"
                        element={
                          user?.role === "admin" ? (
                            <Pages />
                          ) : (
                            <Navigate to="/" replace />
                          )
                        }
                      />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                )}
              </PageTransition>
            </AnimatePresence>
          )}
        </main>
        <footer className="app-footer">
          <span>
            <Sprout size={15} />
            {t.footer}
          </span>
          <span>
            © {new Date().getFullYear()}
            {t.copy["sterk"]}
          </span>
        </footer>
      </div>
    </div>
  );
}
export default function App() {
  return (
    <Provider>
      <Shell />
    </Provider>
  );
}
