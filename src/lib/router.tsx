import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type RouterValue = {
  path: string;
  search: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
};

const RouterContext = createContext<RouterValue>({
  path: '/',
  search: '',
  navigate: () => undefined,
});

function readLocation() {
  return { path: window.location.pathname, search: window.location.search };
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    const onPop = () => setLocation(readLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const [pathPart, queryPart = ''] = to.split('?');
    const target = queryPart ? `${pathPart}?${queryPart}` : pathPart;
    if (target === window.location.pathname + window.location.search) return;
    window.history[options?.replace ? 'replaceState' : 'pushState']({}, '', target);
    setLocation({ path: pathPart, search: queryPart ? `?${queryPart}` : '' });
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const value = useMemo(() => ({ ...location, navigate }), [location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  return useContext(RouterContext);
}

export function useQuery() {
  const { search } = useRouter();
  return useMemo(() => new URLSearchParams(search), [search]);
}

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export function Link({ to, children, onClick, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

/** Matches `/bookings/:code` style patterns and returns params. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const a = path.split('/').filter(Boolean);
  if (p.length !== a.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i += 1) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}
