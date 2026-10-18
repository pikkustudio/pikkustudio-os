import { useLocation, useNavigate, useSearch } from '@tanstack/react-router'

import { EmailDetail } from "../blocks/EmailDetail";
import { EmailsList } from "../blocks/EmailsList";
import { EmailTabs, type EmailsTab } from "../blocks/EmailTabs";
import { useEmails } from "../lib/emails";
import { useProjectKey } from "../lib/project";
import { CardsSkeleton, QueryState } from "../blocks/QueryState";
import { Page } from "../blocks/Page";


export function EmailsScreen() {
  const navigate = useNavigate();
  const key = useProjectKey();
  const { query, data } = useEmails(key);
  const q = useSearch({ strict: false }) as {
    email?: string;
    lang?: "en" | "de" | "ar";
    device?: "phone" | "text";
  };
  const set = (patch: Record<string, unknown>) =>
    navigate({
      to: ".",
      search: ((prev: object) => ({ ...prev, ...patch })) as never,
      replace: true,
    });
  const pathname = useLocation({ select: (l) => l.pathname });
  const toInbox = () =>
    navigate({
      to: pathname.replace(/\/emails$/, "/inbox"),
      search: ((prev: object) => ({ ...prev, channel: "email", email: undefined, lang: undefined, device: undefined })) as never,
    });
  const tabs = <EmailTabs tab="templates" onTab={(next: EmailsTab) => (next === "inbox" ? toInbox() : undefined)} />;
  if (q.email)
    return !data.emails.length ? (
      <QueryState query={query} skeleton={<CardsSkeleton count={2} />}>{() => null}</QueryState>
    ) : (
      <EmailDetail
        projectKey={key}
        data={data}
        id={q.email}
        lang={q.lang ?? "en"}
        device={q.device ?? "computer"}
        onBack={() => set({ email: undefined })}
        onPick={(email) => set({ email })}
        onLang={(lang) => set({ lang: lang === "en" ? undefined : lang })}
        onDevice={(device) =>
          set({ device: device === "computer" ? undefined : device })
        }
      />
    );
  return (
    <Page gap="list">
      {query.isSuccess ? null : tabs}
      <QueryState query={query} skeleton={<CardsSkeleton count={3} />}>
        {() => <EmailsList data={data} tabs={tabs} onOpen={(email) => set({ email })} />}
      </QueryState>
    </Page>
  );
}
