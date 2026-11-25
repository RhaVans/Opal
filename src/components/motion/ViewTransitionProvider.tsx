'use client';

import Link, { type LinkProps } from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { flushSync } from 'react-dom';
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { useMotionMode } from './MotionProvider';

export type RouteTransitionType =
  | 'nav-forward'
  | 'nav-backward'
  | 'morph'
  | 'orb-reveal'
  | 'state-morph';

export interface NavigateOptions {
  type?: RouteTransitionType;
  morphId?: string;
  targetMorphId?: string;
  originRoute?: string;
}

export interface DomTransitionOptions {
  type?: RouteTransitionType;
  sourceId?: string;
  targetId?: string;
  focusSelector?: string | null;
}

interface ViewTransitionLike {
  finished: Promise<void>;
  ready: Promise<void>;
}

type StartViewTransitionFn = (
  arg:
    | (() => void | Promise<void>)
    | { update: () => void | Promise<void>; types?: string[] }
) => ViewTransitionLike;

interface LastMorphOrigin {
  fromHref: string;
  pairId: string;
}

interface ViewTransitionContextValue {
  navigate: (href: string, options?: NavigateOptions) => void;
  runDomTransition: (update: () => void, options?: DomTransitionOptions) => void;
  getStudyReturn: () => LastMorphOrigin | null;
}

const ViewTransitionContext = createContext<ViewTransitionContextValue>({
  navigate: () => {},
  runDomTransition: (update) => update(),
  getStudyReturn: () => null,
});

function getRouteRank(href: string): number {
  const path = href.split('?')[0].split('#')[0] || '/';
  if (path === '/') return 0;
  if (path.startsWith('/chapters')) return 1;
  if (path.startsWith('/drills')) return 2;
  if (path.startsWith('/cbt')) return 2.5;
  if (path.startsWith('/stats')) return 3;
  if (path.startsWith('/study')) return 10;
  return 1;
}

function clearAllMorphNames(): void {
  if (typeof document === 'undefined') return;
  const nodes = document.querySelectorAll<HTMLElement>('[data-vt-id]');
  nodes.forEach((node) => {
    node.style.viewTransitionName = '';
  });
}

function applyMorphName(id: string | undefined): void {
  if (!id || typeof document === 'undefined') return;
  const el = document.querySelector<HTMLElement>(`[data-vt-id="${CSS.escape(id)}"]`);
  if (el) {
    el.style.viewTransitionName = 'morph-stage';
  }
}

function startTransitionWithType(
  update: () => void | Promise<void>,
  type: RouteTransitionType
): ViewTransitionLike | null {
  if (typeof document === 'undefined') return null;
  const doc = document as unknown as { startViewTransition?: StartViewTransitionFn };
  if (typeof doc.startViewTransition !== 'function') return null;

  document.documentElement.dataset.vtType = type;

  const supportsTypes =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('selector(:active-view-transition-type(morph))');

  const vt = supportsTypes
    ? doc.startViewTransition({ update, types: [type] })
    : doc.startViewTransition(update);

  vt.ready.catch(() => {});
  return vt;
}

function SearchCommitSync({ onCommit }: { onCommit: () => void }) {
  const searchParams = useSearchParams();
  const key = searchParams.toString();

  useLayoutEffect(() => {
    onCommit();
  }, [key, onCommit]);

  return null;
}

export function ViewTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { reduced } = useMotionMode();

  const pendingCommitResolveRef = useRef<(() => void) | null>(null);
  const pendingTimerRef = useRef<number | null>(null);
  const pendingTargetMorphIdRef = useRef<string | undefined>(undefined);
  const lastStudyOriginRef = useRef<LastMorphOrigin | null>(null);

  const finishCommit = useCallback(() => {
    if (pendingTimerRef.current !== null) {
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    if (pendingTargetMorphIdRef.current) {
      clearAllMorphNames();
      applyMorphName(pendingTargetMorphIdRef.current);
      pendingTargetMorphIdRef.current = undefined;
    }
    if (pendingCommitResolveRef.current) {
      const resolve = pendingCommitResolveRef.current;
      pendingCommitResolveRef.current = null;
      resolve();
    }
  }, []);

  // Resolve active route ViewTransition right after React commits the new route to the DOM
  useLayoutEffect(() => {
    finishCommit();
  }, [pathname, finishCommit]);

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current);
      }
      if (pendingCommitResolveRef.current) {
        pendingCommitResolveRef.current();
      }
    };
  }, []);

  const focusDestinationStage = useCallback(() => {
    if (typeof document === 'undefined') return;
    const main = document.getElementById('main-content');
    main?.focus({ preventScroll: true });
  }, []);

  const navigate = useCallback(
    (href: string, options: NavigateOptions = {}) => {
      if (typeof window === 'undefined') {
        router.push(href);
        return;
      }

      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (href === currentUrl) {
        return;
      }

      if (href.startsWith('/study') && options.morphId) {
        lastStudyOriginRef.current = {
          fromHref: options.originRoute ?? pathname,
          pairId: options.morphId,
        };
      }

      const doc = document as unknown as { startViewTransition?: StartViewTransitionFn };
      if (reduced || typeof doc.startViewTransition !== 'function') {
        router.push(href);
        window.requestAnimationFrame(focusDestinationStage);
        return;
      }

      // Clean up any stale in-flight transition commit
      if (pendingCommitResolveRef.current) {
        finishCommit();
      }

      clearAllMorphNames();
      applyMorphName(options.morphId);
      pendingTargetMorphIdRef.current = options.targetMorphId;

      const fromRank = getRouteRank(pathname);
      const toRank = getRouteRank(href);
      const inferredType: RouteTransitionType =
        options.type ??
        (options.morphId
          ? 'morph'
          : toRank > fromRank
            ? 'nav-forward'
            : toRank < fromRank
              ? 'nav-backward'
              : 'morph');

      const updatePromise = () =>
        new Promise<void>((resolve) => {
          pendingCommitResolveRef.current = resolve;
          router.push(href);
          // Safety release in case query-only update does not change pathname
          pendingTimerRef.current = window.setTimeout(() => {
            finishCommit();
          }, 180);
        });

      const vt = startTransitionWithType(updatePromise, inferredType);
      if (!vt) {
        pendingTargetMorphIdRef.current = undefined;
        clearAllMorphNames();
        router.push(href);
        return;
      }

      vt.finished
        .catch(() => {})
        .finally(() => {
          clearAllMorphNames();
          delete document.documentElement.dataset.vtType;
          focusDestinationStage();
        });
    },
    [pathname, router, reduced, finishCommit, focusDestinationStage]
  );

  const runDomTransition = useCallback(
    (update: () => void, options: DomTransitionOptions = {}) => {
      const doc = typeof document !== 'undefined'
        ? (document as unknown as { startViewTransition?: StartViewTransitionFn })
        : undefined;

      if (reduced || !doc || typeof doc.startViewTransition !== 'function') {
        update();
        if (options.focusSelector !== null && typeof document !== 'undefined') {
          const target = options.focusSelector
            ? document.querySelector<HTMLElement>(options.focusSelector)
            : document.getElementById('main-content');
          target?.focus({ preventScroll: true });
        }
        return;
      }

      clearAllMorphNames();
      applyMorphName(options.sourceId);

      const type: RouteTransitionType = options.type ?? 'state-morph';
      const vt = startTransitionWithType(() => {
        flushSync(update);
        clearAllMorphNames();
        applyMorphName(options.targetId);
      }, type);

      if (!vt) {
        clearAllMorphNames();
        update();
        return;
      }

      vt.finished
        .catch(() => {})
        .finally(() => {
          clearAllMorphNames();
          delete document.documentElement.dataset.vtType;
          if (options.focusSelector !== null) {
            const target = options.focusSelector
              ? document.querySelector<HTMLElement>(options.focusSelector)
              : document.getElementById('main-content');
            target?.focus({ preventScroll: true });
          }
        });
    },
    [reduced]
  );

  const getStudyReturn = useCallback(() => lastStudyOriginRef.current, []);

  const value = useMemo(
    () => ({ navigate, runDomTransition, getStudyReturn }),
    [navigate, runDomTransition, getStudyReturn]
  );

  return (
    <ViewTransitionContext.Provider value={value}>
      <Suspense fallback={null}>
        <SearchCommitSync onCommit={finishCommit} />
      </Suspense>
      {children}
    </ViewTransitionContext.Provider>
  );
}

export function useViewTransition(): ViewTransitionContextValue {
  return useContext(ViewTransitionContext);
}

interface TransitionLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>,
    LinkProps {
  ref?: Ref<HTMLAnchorElement>;
  children: ReactNode;
  transitionType?: RouteTransitionType;
  morphId?: string;
  targetMorphId?: string;
  originRoute?: string;
}

export function TransitionLink({
  ref,
  href,
  onClick,
  transitionType,
  morphId,
  targetMorphId,
  originRoute,
  children,
  ...rest
}: TransitionLinkProps) {
  const { navigate } = useViewTransition();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    const targetUrl = typeof href === 'string' ? href : href.pathname ?? '/';
    e.preventDefault();
    navigate(targetUrl, {
      type: transitionType,
      morphId,
      targetMorphId,
      originRoute,
    });
  };

  return (
    <Link ref={ref} href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
