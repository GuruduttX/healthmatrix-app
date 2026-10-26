import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Alert, AppState, Platform } from 'react-native';

import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/services/api';

import {
  type SupportConversation,
  type SupportMessage,
  type SupportSummary,
  type SupportTopic,
} from './types';

/** How often an open chat on screen asks for the team's replies. There's no push channel. */
const POLL_MS = 4000;

// The member's chats, shared by the Care card and the support pages.
let snapshot: { memberId: string; chats: SupportSummary[] } | null = null;
const listeners = new Set<() => void>();
let loading: { memberId: string; promise: Promise<void> } | null = null;
/** Whole chats seen this session, so a chat reopens at once while it loads again. */
const opened = new Map<string, SupportConversation>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(memberId: string, chats: SupportSummary[]) {
  snapshot = { memberId, chats };
  listeners.forEach((listener) => listener());
}

/** Fetches the member's chats again. Calls made while one is in flight share it. */
export function refreshSupport(memberId: string) {
  if (loading?.memberId === memberId) return loading.promise;
  const promise = api<{ conversations: SupportSummary[] }>('/support')
    .then(({ conversations }) => publish(memberId, conversations))
    .finally(() => {
      loading = null;
    });
  loading = { memberId, promise };
  return promise;
}

/** Keeps a chat's latest state, and puts it on the list so Care shows it without asking again. */
function remember(memberId: string, chat: SupportConversation) {
  opened.set(chat.id, chat);
  const { messages: _messages, ...summary } = chat;
  const others = snapshot?.memberId === memberId ? snapshot.chats.filter((c) => c.id !== chat.id) : [];
  publish(
    memberId,
    [summary, ...others].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
}

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/** The member's chats: the open one, if any, and the past ones. All null until the first load. */
export function useSupportChats() {
  const memberId = useAuth().member?.id;
  const current = useSyncExternalStore(subscribe, () => snapshot);
  const chats = current && current.memberId === memberId ? current.chats : null;
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    await refreshSupport(memberId).then(
      () => setError(null),
      (e: unknown) => setError(messageOf(e, 'Could not load your chats')),
    );
  }, [memberId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    chats,
    open: chats ? (chats.find((chat) => chat.status === 'open') ?? null) : null,
    past: chats ? chats.filter((chat) => chat.status === 'ended') : null,
    error,
    refresh,
  };
}

/** Starts a chat with the team: its topic and the member's first message. */
export async function startSupportChat(memberId: string, topic: SupportTopic, text: string) {
  const { conversation } = await api<{ conversation: SupportConversation }>('/support', {
    method: 'POST',
    body: { topic, text },
  });
  remember(memberId, conversation);
  return conversation;
}

/** Ends a chat from the member's side. */
export async function endSupportChat(memberId: string, id: string) {
  const { conversation } = await api<{ conversation: SupportConversation }>(`/support/${id}`, {
    method: 'PATCH',
    body: { status: 'ended' },
  });
  remember(memberId, conversation);
  return conversation;
}

/** Asks before ending a chat. `Alert` has no buttons on web, so web uses `confirm`. */
export function confirmEndChat(message = 'You can start a new chat any time.') {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`End this chat?\n\n${message}`) ?? false);
  }
  return new Promise<boolean>((resolve) =>
    Alert.alert('End this chat?', message, [
      { text: 'Keep chatting', style: 'cancel', onPress: () => resolve(false) },
      { text: 'End chat', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

/** A message on its way, shown faded until the server has it. */
export type PendingMessage = SupportMessage & { pending: true };

/**
 * One chat, kept current while it's on screen: an open chat asks for the team's replies every few
 * seconds, and again whenever the member comes back to the app.
 */
export function useSupportChat(id: string | null) {
  const memberId = useAuth().member?.id;
  const [chat, setChat] = useState<SupportConversation | null>(() => (id && opened.get(id)) || null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  /** Bumped by each send, so a poll that started before it can't put back the older chat. */
  const epoch = useRef(0);
  const polling = useRef(false);

  const keep = useCallback(
    (next: SupportConversation) => {
      setChat(next);
      if (memberId) remember(memberId, next);
    },
    [memberId],
  );

  const load = useCallback(() => {
    if (!id || !memberId || polling.current) return Promise.resolve();
    polling.current = true;
    const started = epoch.current;
    return api<{ conversation: SupportConversation }>(`/support/${id}`)
      .then(
        ({ conversation }) => {
          if (epoch.current === started) keep(conversation);
          setError(null);
        },
        (e: unknown) => setError(messageOf(e, 'Could not load this chat')),
      )
      .finally(() => {
        polling.current = false;
      });
  }, [id, memberId, keep]);

  useEffect(() => {
    void load();
  }, [load]);

  // Only ever this chat: what was last loaded for it, or what this session last saw of it.
  const shown = chat?.id === id ? chat : (id && opened.get(id)) || null;
  const open = shown?.status === 'open';
  useFocusEffect(
    useCallback(() => {
      if (!open) return;
      let timer: ReturnType<typeof setInterval> | undefined;
      const start = () => {
        timer ??= setInterval(() => void load(), POLL_MS);
      };
      const stop = () => {
        clearInterval(timer);
        timer = undefined;
      };
      if (AppState.currentState === 'active') start();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state !== 'active') return stop();
        void load();
        start();
      });
      return () => {
        stop();
        subscription.remove();
      };
    }, [open, load]),
  );

  /** Sends a message. Resolves to null once it's in, or to what went wrong. */
  const send = async (text: string): Promise<string | null> => {
    if (!id || !memberId) return 'Please sign in';
    epoch.current += 1;
    const message: PendingMessage = {
      id: `pending-${Date.now()}`,
      from: 'member',
      text,
      at: new Date().toISOString(),
      pending: true,
    };
    setPending((list) => [...list, message]);
    try {
      const { conversation } = await api<{ conversation: SupportConversation }>(
        `/support/${id}/messages`,
        { method: 'POST', body: { text } },
      );
      epoch.current += 1;
      keep(conversation);
      return null;
    } catch (e) {
      // The chat may have been ended by the team meanwhile: show where it stands now.
      void load();
      return messageOf(e, 'Your message didn’t send. Try again.');
    } finally {
      setPending((list) => list.filter((item) => item.id !== message.id));
    }
  };

  const end = async () => {
    if (!id || !memberId) return;
    epoch.current += 1;
    keep(await endSupportChat(memberId, id));
  };

  return { chat: shown, error, pending, send, end, reload: load };
}
