"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CollectionPanel from "./CollectionPanel";
import ParticlePanel from "./ParticlePanel";
import SettingsPanel from "./SettingsPanel";
import { ADMIN_WEEGLOO } from "@/lib/weegloo/config";
import { clearToken, getToken, loginWithPopup, verifyAdmin, type AdminUser } from "@/lib/weegloo/auth";
import { WeeglooAdminStore, WeeglooError } from "@/lib/weegloo/cma";
import { DemoAdminStore, resetDemoData, type AdminStore, type Versioned } from "@/lib/content/store";
import type { CollectionKey, SiteData, SiteSettings } from "@/lib/content/types";

type Tab = "content" | "particles" | CollectionKey;

const TABS: { id: Tab; label: string }[] = [
  { id: "content", label: "기본 정보" },
  { id: "particles", label: "파티클" },
  { id: "services", label: "서비스" },
  { id: "projects", label: "포트폴리오" },
  { id: "process", label: "진행 과정" },
  { id: "testimonials", label: "고객 후기" },
];

type Toast = { id: number; msg: string; tone: "ok" | "error" };

export default function AdminApp() {
  const [auth, setAuth] = useState<"checking" | "signedOut" | "signedIn">(ADMIN_WEEGLOO ? "checking" : "signedIn");
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authError, setAuthError] = useState("");
  const [store, setStore] = useState<AdminStore | null>(ADMIN_WEEGLOO ? null : new DemoAdminStore());

  const signOut = useCallback((msg = "") => {
    clearToken();
    setStore(null);
    setUser(null);
    setAuth("signedOut");
    setAuthError(msg);
  }, []);

  const accept = useCallback(
    async (token: string) => {
      try {
        const u = await verifyAdmin(token);
        setUser(u);
        setStore(new WeeglooAdminStore(token));
        setAuth("signedIn");
        setAuthError("");
      } catch (e) {
        signOut(e instanceof Error ? e.message : "로그인하지 못했습니다.");
      }
    },
    [signOut],
  );

  useEffect(() => {
    if (!ADMIN_WEEGLOO) return;
    const token = getToken();
    if (token) accept(token);
    else setAuth("signedOut");
  }, [accept]);

  const login = async () => {
    setAuthError("");
    try {
      await accept(await loginWithPopup());
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "로그인하지 못했습니다.");
    }
  };

  if (auth === "checking") {
    return (
      <div className="alogin">
        <p>확인 중…</p>
      </div>
    );
  }

  if (auth === "signedOut" || !store) {
    return (
      <div className="alogin">
        <div className="alogin__card">
          <span className="brand__mark" aria-hidden="true" />
          <h1>Lumea 관리자</h1>
          <p>사이트 내용을 수정하려면 관리자 계정으로 로그인해 주세요.</p>
          <button type="button" className="abtn abtn--wide" onClick={login}>
            관리자 로그인
          </button>
          {authError && <p className="field__error">{authError}</p>}
          <a href="/" className="alogin__back">
            ← 사이트로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return <AdminEditor store={store} user={user} onSignOut={() => signOut()} onAuthExpired={signOut} />;
}

function AdminEditor({
  store,
  user,
  onSignOut,
  onAuthExpired,
}: {
  store: AdminStore;
  user: AdminUser | null;
  onSignOut: () => void;
  onAuthExpired: (msg: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("content");
  const [data, setData] = useState<SiteData | null>(null);
  const [settingsMeta, setSettingsMeta] = useState<Versioned>({});
  const [loadError, setLoadError] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const notify = useCallback(
    (msg: string, tone: "ok" | "error" = "ok") => {
      const id = ++toastId.current;
      setToasts((t) => [...t, { id, msg, tone }]);
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 3000);
    },
    [],
  );

  const handleError = useCallback(
    (e: unknown, fallback: string) => {
      if (e instanceof WeeglooError && e.status === 401) {
        onAuthExpired(e.message);
        return;
      }
      notify(e instanceof Error ? e.message : fallback, "error");
    },
    [notify, onAuthExpired],
  );

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const { settingsMeta: meta, ...rest } = await store.loadAll();
      setData(rest);
      setSettingsMeta(meta);
    } catch (e) {
      if (e instanceof WeeglooError && e.status === 401) onAuthExpired(e.message);
      else setLoadError(e instanceof Error ? e.message : "불러오지 못했습니다.");
    }
  }, [store, onAuthExpired]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async (next: SiteSettings) => {
    try {
      const meta = await store.saveSettings(next, settingsMeta);
      setSettingsMeta(meta);
      setData((d) => (d ? { ...d, settings: { ...next, id: meta.id ?? next.id } } : d));
      notify("저장하고 게시했습니다.");
    } catch (e) {
      handleError(e, "저장하지 못했습니다.");
    }
  };

  const collectionNotify = useCallback(
    (msg: string, tone: "ok" | "error" = "ok") => {
      if (tone === "error" && /로그인이 만료/.test(msg)) onAuthExpired(msg);
      else notify(msg, tone);
    },
    [notify, onAuthExpired],
  );

  const panel = useMemo(() => {
    if (!data) return null;
    if (tab === "content")
      return (
        <SettingsPanel
          key={`content-${settingsMeta._version ?? 0}`}
          groupIds={["hero", "about", "contact"]}
          settings={data.settings}
          onSave={saveSettings}
        />
      );
    if (tab === "particles")
      return <ParticlePanel key={`particles-${settingsMeta._version ?? 0}`} settings={data.settings} onSave={saveSettings} />;
    return (
      <CollectionPanel
        key={tab}
        kind={tab}
        items={data[tab]}
        store={store}
        notify={collectionNotify}
        onItemsChange={(items) => setData((d) => (d ? { ...d, [tab]: items } : d))}
      />
    );
  }, [data, tab, settingsMeta, store, collectionNotify]);

  return (
    <div className="admin">
      <header className="admin__bar">
        <a href="/" className="brand">
          <span className="brand__mark" aria-hidden="true" />
          LUMEA <small>관리자</small>
        </a>
        <div className="admin__user">
          {user && <span>{user.name || user.email}</span>}
          <a href="/" className="abtn abtn--ghost abtn--small" target="_blank" rel="noreferrer">
            사이트 보기
          </a>
          {store.mode === "weegloo" && (
            <button type="button" className="abtn abtn--text abtn--small" onClick={onSignOut}>
              로그아웃
            </button>
          )}
        </div>
      </header>

      {store.mode === "demo" && (
        <div className="admin__demo">
          <span>
            <strong>데모 모드</strong> — 변경 내용은 이 브라우저에만 저장되고, 같은 브라우저의 메인 페이지에 바로 반영됩니다.
          </span>
          <button
            type="button"
            className="abtn abtn--text abtn--small"
            onClick={() => {
              if (!window.confirm("데모 데이터를 처음 상태로 되돌릴까요?")) return;
              resetDemoData();
              load();
              notify("처음 상태로 되돌렸습니다.");
            }}
          >
            초기화
          </button>
        </div>
      )}

      <div className="admin__layout">
        <nav className="admin__tabs" aria-label="관리 메뉴">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? "is-active" : ""}
              aria-current={tab === t.id ? "page" : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {data && t.id !== "content" && t.id !== "particles" && <span>{data[t.id].length}</span>}
            </button>
          ))}
        </nav>
        <main className="admin__main">
          {loadError ? (
            <div className="apanel">
              <p className="field__error">{loadError}</p>
              <button type="button" className="abtn" onClick={load}>
                다시 시도
              </button>
            </div>
          ) : data ? (
            panel
          ) : (
            <div className="apanel">
              <p>불러오는 중…</p>
            </div>
          )}
        </main>
      </div>

      <div className="atoasts" aria-live="polite">
        {toasts.map((t) => (
          <p key={t.id} className={`atoast atoast--${t.tone}`}>
            {t.msg}
          </p>
        ))}
      </div>
    </div>
  );
}
