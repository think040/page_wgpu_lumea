import { CMA_BASE, CONSOLE_ORIGIN, SPACE_ID } from "./config";

const TOKEN_KEY = "access_token";

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

function saveToken(token: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

/** Opens the Weegloo console sign-in popup and resolves with the access token it posts back. */
export function loginWithPopup(): Promise<string> {
  return new Promise((resolve, reject) => {
    const popup = window.open(
      `${CONSOLE_ORIGIN}/login?origin=${encodeURIComponent(location.origin)}`,
      "weegloo-login",
      "width=500,height=640",
    );
    if (!popup) {
      reject(new Error("팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요."));
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== CONSOLE_ORIGIN) return;
      const token = (event.data as { accessToken?: unknown } | null)?.accessToken;
      if (typeof token !== "string" || !token.trim()) return;
      cleanup();
      saveToken(token.trim());
      resolve(token.trim());
    };
    const timer = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error("로그인 창이 닫혔습니다."));
      }
    }, 600);
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(timer);
    };
    window.addEventListener("message", onMessage);
  });
}

export type AdminUser = { name: string; email: string };

/** Validates the token and that the user is a member of this site's space. */
export async function verifyAdmin(token: string): Promise<AdminUser> {
  const auth = { Authorization: `Bearer ${token}` };
  const me = await fetch(`${CMA_BASE}/me`, { headers: auth });
  if (!me.ok) throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
  const user = (await me.json()) as { name?: string; email?: string };

  const params = new URLSearchParams({ limit: "100" });
  const res = await fetch(`${CMA_BASE}/me/space-memberships?${params}`, { headers: auth });
  if (!res.ok) throw new Error("권한을 확인하지 못했습니다.");
  const body = (await res.json()) as { items?: { sys?: { space?: { sys?: { id?: string } } } }[] };
  const isMember = (body.items ?? []).some((m) => m.sys?.space?.sys?.id === SPACE_ID);
  if (!isMember) throw new Error("이 사이트를 관리할 권한이 없는 계정입니다.");

  return { name: user.name ?? "", email: user.email ?? "" };
}
