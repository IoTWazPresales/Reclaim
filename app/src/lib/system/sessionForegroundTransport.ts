/**
 * JS adapter for the one native health foreground service.
 * The service is a HeadlessJsTaskService so the domain loop keeps running after the
 * activity is destroyed. Opening or closing the phone UI must not stop it.
 * Stop only through stopSessionForeground for the owning domain.
 */
import { AppRegistry, NativeModules, Platform } from 'react-native';
import { logger } from '@/lib/logger';
import {
  planSessionForegroundStart,
  type SessionForegroundDomain,
  type SessionForegroundSnapshot,
  type SessionForegroundStartPlan,
} from '@/lib/system/sessionForegroundPlan';

export const SESSION_FOREGROUND_TASK = 'ReclaimSessionForeground';

export type SessionForegroundRequest = {
  domain: SessionForegroundDomain;
  sessionId: string;
  taskTitle: string;
  taskDesc: string;
  linkingURI: string;
  delayMs: number;
  endsAtMs: number;
};

type NativeState = {
  running?: boolean;
  domain?: string | null;
  sessionId?: string | null;
};

type SessionForegroundNative = {
  getState: () => Promise<NativeState>;
  start: (options: SessionForegroundRequest) => Promise<boolean>;
  stop: (domain: string) => Promise<boolean>;
};

type SessionTaskHandler = (data: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, SessionTaskHandler>();

const native = NativeModules.ReclaimSessionForeground as SessionForegroundNative | undefined;

function ensureHeadlessTaskRegistered(): void {
  if (Platform.OS !== 'android') return;
  const marker = globalThis as { __reclaimSessionForegroundTask?: boolean };
  if (marker.__reclaimSessionForegroundTask) return;
  marker.__reclaimSessionForegroundTask = true;
  AppRegistry.registerHeadlessTask(SESSION_FOREGROUND_TASK, () => async (data: Record<string, unknown>) => {
    const domain = String(data?.domain ?? '');
    const handler = handlers.get(domain);
    if (!handler) {
      if (__DEV__) logger.debug('[SESSION_FGS] no handler for domain', domain);
      return;
    }
    await handler(data ?? {});
  });
}

ensureHeadlessTaskRegistered();

export function registerSessionForegroundHandler(
  domain: SessionForegroundDomain,
  handler: SessionTaskHandler,
): void {
  handlers.set(domain, handler);
}

export async function readSessionForegroundSnapshot(): Promise<SessionForegroundSnapshot> {
  if (Platform.OS !== 'android' || !native?.getState) {
    return { running: false, domain: null, sessionId: null };
  }
  try {
    const state = await native.getState();
    return {
      running: Boolean(state?.running),
      domain: state?.domain ? String(state.domain) : null,
      sessionId: state?.sessionId ? String(state.sessionId) : null,
    };
  } catch (e) {
    if (__DEV__) logger.debug('[SESSION_FGS] getState failed', e);
    return { running: false, domain: null, sessionId: null };
  }
}

export async function startSessionForeground(request: SessionForegroundRequest): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!request.sessionId) return false;
  if (!native?.start || !native?.stop) {
    logger.warn('[SESSION_FGS] native module missing — refusing start', { domain: request.domain });
    return false;
  }

  const snapshot = await readSessionForegroundSnapshot();
  const plan: SessionForegroundStartPlan = planSessionForegroundStart(
    request.domain,
    request.sessionId,
    snapshot,
  );
  if (plan === 'refuse-other-domain') {
    logger.warn('[SESSION_FGS] refused — another domain owns the service', {
      owner: snapshot.domain,
      domain: request.domain,
      sessionId: request.sessionId,
    });
    return false;
  }
  if (plan === 'already-running') return true;

  try {
    if (plan === 'replace-own-session') {
      await native.stop(request.domain);
    }
    await native.start(request);
    return true;
  } catch (e) {
    logger.warn('[SESSION_FGS] start failed', e);
    return false;
  }
}

/** Stop only when this domain owns the native service, including after a JS reload cleared the in-memory owner. */
export async function stopSessionForeground(domain: SessionForegroundDomain): Promise<void> {
  if (Platform.OS !== 'android' || !native?.stop) return;
  const snapshot = await readSessionForegroundSnapshot();
  if (snapshot.running && snapshot.domain && snapshot.domain !== domain) return;
  try {
    await native.stop(domain);
  } catch (e) {
    logger.warn('[SESSION_FGS] stop failed', e);
  }
}

export async function isNativeSessionForegroundRunning(
  domain: SessionForegroundDomain,
  sessionId: string,
): Promise<boolean> {
  const snapshot = await readSessionForegroundSnapshot();
  return snapshot.running && snapshot.domain === domain && snapshot.sessionId === sessionId;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Run until this domain+session no longer owns the service. `tick` returns true when the session itself is finished. */
export async function runSessionForegroundLoop(
  domain: SessionForegroundDomain,
  sessionId: string,
  delayMs: number,
  tick: () => Promise<boolean>,
): Promise<void> {
  const delay = Math.max(1000, delayMs || 5000);
  while (await isNativeSessionForegroundRunning(domain, sessionId)) {
    let finished = false;
    try {
      finished = await tick();
    } catch (e) {
      if (__DEV__) logger.debug('[SESSION_FGS] tick failed', { domain, e });
    }
    if (finished) return;
    await sleep(delay);
  }
}
