import { useNavigate, useParams, useSearch } from '@tanstack/react-router'

import { EmailDetail } from "../blocks/EmailDetail";
import { EmailsList } from "../blocks/EmailsList";
import { keepSearch } from "../lib/project-url";
import { useEmails } from "../lib/emails";
import { useProjectKey } from "../lib/project";
import { CardsSkeleton, QueryState } from "../blocks/QueryState";
import { Page } from "../blocks/Page";


export function EmailsScreen() {
  const navigate = useNavigate();
  const key = useProjectKey();
  const { query, data } = useEmails(key);
  const { emailId } = useParams({ strict: false }) as { emailId?: string };
  const q = useSearch({ strict: false }) as {
    lang?: "en" | "de" | "ar";
    device?: "phone" | "text";
  };
  const set = (patch: Record<string, unknown>) =>
    navigate({
      to: ".",
      search: ((prev: object) => ({ ...prev, ...patch })) as never,
      replace: true,
    });
  const open = (id: string) =>
    navigate({
      to: `/emails/${encodeURIComponent(id)}` as never,
      search: keepSearch as never,
    });
  if (emailId)
    return !data.emails.length ? (
      <QueryState query={query} skeleton={<CardsSkeleton count={2} />}>{() => null}</QueryState>
    ) : (
      <EmailDetail
        projectKey={key}
        data={data}
        id={emailId}
        lang={q.lang ?? "en"}
        device={q.device ?? "computer"}
        backTo="/emails"
        onPick={open}
        onLang={(lang) => set({ lang: lang === "en" ? undefined : lang })}
        onDevice={(device) =>
          set({ device: device === "computer" ? undefined : device })
        }
      />
    );
  return (
    <Page gap="list">
      <QueryState query={query} skeleton={<CardsSkeleton count={3} />}>
        {() => <EmailsList data={data} onOpen={open} />}
      </QueryState>
    </Page>
  );
}
