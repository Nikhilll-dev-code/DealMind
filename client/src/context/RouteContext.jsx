import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const RouteContext = createContext();

export function RouteProvider({ children }) {
  const [currentPath, setCurrentPath] = useState(() => {
    // Check path or hash
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) return hash.startsWith('/') ? hash : `/${hash}`;
    const pathname = window.location.pathname;
    return pathname || '/dashboard';
  });

  const navigate = useCallback((to, options = {}) => {
    const target = to.startsWith('/') ? to : `/${to}`;
    if (options.replace) {
      window.history.replaceState({}, '', target);
    } else {
      window.history.pushState({}, '', target);
    }
    setCurrentPath(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname || '/dashboard';
      setCurrentPath(pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Parse path and query
  const [pathname, queryString] = currentPath.split('?');
  const searchParams = new URLSearchParams(queryString || '');

  return (
    <RouteContext.Provider value={{ currentPath, pathname, searchParams, navigate }}>
      {children}
    </RouteContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRouter must be used within RouteProvider');
  return ctx;
}

export function Link({ to, children, className = '', onClick, ...props }) {
  const { navigate } = useRouter();

  const handleClick = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return; // Allow opening in new tab
    e.preventDefault();
    if (onClick) onClick(e);
    navigate(to);
  };

  return (
    <a href={to} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}
