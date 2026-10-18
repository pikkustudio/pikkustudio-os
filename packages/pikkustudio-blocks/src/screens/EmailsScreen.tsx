import { useNavigate, useSearch } from '@tanstack/react-router'

import { EmailDetail } from "../blocks/EmailDetail";
import { EmailInbox } from "../blocks/EmailInbox";
import { EmailsList } from "../blocks/EmailsList";
import { EmailTabs, type EmailsTab } from "../blocks/EmailTabs";
import { InboxDetail } from "../blocks/InboxDetail";
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
    inbox?: string;
    tab?: EmailsTab;
    lang?: "en" | "de" | "ar";
    device?: "phone" | "text";
  };
  const set = (patch: Record<string, unknown>) =>
    navigate({
      to: ".",
      search: ((prev: object) => ({ ...prev, ...patch })) as never,
      replace: true,
    });
  const tab: EmailsTab = q.tab === "inbox" ? "inbox" : "templates";
  const tabs = <EmailTabs tab={tab} onTab={(next) => set({ tab: next === "inbox" ? "inbox" : undefined, email: undefined, inbox: undefined })} />;
  if (tab === "inbox")
    return (
      <Page gap="list">
        {q.inbox ? (
          <InboxDetail
            id={q.inbox}
            device={q.device ?? "computer"}
            onBack={() => set({ inbox: undefined })}
            onDevice={(device) => set({ device: device === "computer" ? undefined : device })}
          />
        ) : (
          <EmailInbox tabs={tabs} onOpen={(inbox) => set({ inbox })} onTemplates={() => set({ tab: undefined })} />
        )}
      </Page>
    );
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
