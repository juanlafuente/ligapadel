import { useCallback, useEffect, useState } from 'react';

export type Route = 'inicio' | 'clasificacion' | 'calendario' | 'admin';
const ROUTES: Route[] = ['inicio', 'clasificacion', 'calendario', 'admin'];

function parse(hash: string): Route {
  const route = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return ROUTES.includes(route as Route) ? (route as Route) : 'inicio';
}

/** Navegación por #/ruta, que funciona en GitHub Pages sin configurar el servidor. */
export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = useCallback((next: Route) => {
    window.location.hash = `/${next}`;
  }, []);
  return [route, navigate];
}
