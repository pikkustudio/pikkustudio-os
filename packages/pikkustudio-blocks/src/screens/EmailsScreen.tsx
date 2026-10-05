import { useNavigate, useSearch } from '@tanstack/react-router'

import { EmailDetail } from "../blocks/EmailDetail";
import { EmailsList } from "../blocks/EmailsList";
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
      <QueryState query={query} skeleton={<CardsSkeleton count={3} />}>
        {() => <EmailsList data={data} onOpen={(email) => set({ email })} />}
      </QueryState>
    </Page>
  );
}
