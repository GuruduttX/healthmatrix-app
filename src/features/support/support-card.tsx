import { router } from 'expo-router';
import { CircleCheck, Clock, Headset, History, MessageCircle } from 'lucide-react-native';

import { IconTile } from '@/components/ui/icon-tile';
import { Chevron, ListCard, ListRow } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { Tag } from '@/components/ui/tag';

import { chatName, preview, whenShort } from './format';
import { SUPPORT_TOPICS } from './topics';
import { type SupportSummary } from './types';
import { useSupportChats } from './use-support';

export const openSupport = () => router.push('/care/support');
export const openChat = (id: string) => router.push({ pathname: '/care/support/[id]', params: { id } });
export const newChat = () => openChat('new');

/**
 * One chat on a list: its topic, its latest line, and where it stands. The team's unread replies
 * are the one thing that stands out.
 */
export function SupportChatRow({ chat }: { chat: SupportSummary }) {
  const { label, icon } = SUPPORT_TOPICS[chat.topic];
  const when = whenShort(chat.lastMessage?.at ?? chat.updatedAt);
  const tag =
    chat.unread > 0 ? (
      <Tag
        label={`${chat.unread} new ${chat.unread === 1 ? 'reply' : 'replies'}`}
        tone="success"
        icon={MessageCircle}
      />
    ) : chat.status === 'open' ? (
      <Tag label={`Open · ${when}`} tone="neutral" icon={Clock} />
    ) : (
      <Tag label={`Ended · ${when}`} tone="neutral" icon={CircleCheck} />
    );

  return (
    <ListRow
      leading={<IconTile icon={icon} tone={chat.status === 'open' ? 'primary' : 'neutral'} />}
      title={label}
      subtitle={preview(chat.lastMessage)}
      meta={tag}
      trailing={<Chevron />}
      onPress={() => openChat(chat.id)}
      accessibilityLabel={`${chatName(chat)}. ${preview(chat.lastMessage)}. ${
        chat.unread ? `${chat.unread} new` : chat.status === 'open' ? 'Open' : 'Ended'
      }. Opens the chat`}
    />
  );
}

/**
 * Help & support on the Care tab: the open chat with the team when there is one, otherwise a way
 * to start one, and the past chats behind it.
 */
export function SupportCard({ index }: { index?: number }) {
  const { open, past } = useSupportChats();

  return (
    <Section title="Help & support" index={index}>
      <ListCard>
        {open ? (
          <SupportChatRow chat={open} />
        ) : (
          <ListRow
            leading={<IconTile icon={Headset} />}
            title="Chat with support"
            subtitle="Ask us about consults, pods, records or your account"
            trailing={<Chevron />}
            onPress={newChat}
            accessibilityLabel="Chat with support. Starts a new chat"
          />
        )}
        {past?.length ? (
          <ListRow
            leading={<IconTile icon={History} tone="neutral" />}
            title="Past conversations"
            subtitle={`${past.length} ${past.length === 1 ? 'chat' : 'chats'} with the team`}
            trailing={<Chevron />}
            onPress={openSupport}
          />
        ) : null}
      </ListCard>
    </Section>
  );
}
