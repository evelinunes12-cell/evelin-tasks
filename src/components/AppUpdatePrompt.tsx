import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Sparkles, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// How often (ms) to re-check for a new app version (fallback to polling
// in case realtime is not available).
const UPDATE_CHECK_INTERVAL = 60 * 1000; // 1 minute

/**
 * Listens for new app versions and prompts the user with a modal.
 *
 * Two detection sources work together:
 * 1. vite-plugin-pwa autoUpdate — detects a new service worker waiting.
 * 2. `app_version` table in the database — admins bump the version from
 *    the admin panel without redeploying. Realtime + 1-min polling.
 *
 * Critical updates (set by admin) make the modal non-dismissible.
 */
const AppUpdatePrompt = () => {
  const [isCritical, setIsCritical] = useState(false);
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const lastSeenVersionRef = useRef<string | null>(null);
  const pendingVersionRef = useRef<string | null>(null);

  // localStorage keys: persist a "pending update" reminder across reloads/sessions.
  // If the user clicks "Mais tarde", we store the version they postponed so we can
  // re-prompt on the next visit (as long as that version is still the current one).
  const POSTPONED_VERSION_KEY = "zenit:postponed-version";
  const POSTPONED_MESSAGE_KEY = "zenit:postponed-message";

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const interval = window.setInterval(() => {
        registration.update().catch(() => {});
      }, UPDATE_CHECK_INTERVAL);

      const onVisible = () => {
        if (document.visibilityState === "visible") {
          registration.update().catch(() => {});
        }
      };
      document.addEventListener("visibilitychange", onVisible);

      return () => {
        clearInterval(interval);
        document.removeEventListener("visibilitychange", onVisible);
      };
    },
    onRegisterError(err) {
      console.warn("[PWA] SW registration failed:", err);
    },
  });

  // Check the database-managed app version (admin-controlled).
  useEffect(() => {
    let cancelled = false;

    const apply = (data: {
      version: string;
      critical: boolean;
      message: string | null;
    }) => {
      if (cancelled) return;
      pendingVersionRef.current = data.version;

      if (lastSeenVersionRef.current === null) {
        lastSeenVersionRef.current = data.version;

        // Honor critical flag on first load.
        if (data.critical) {
          setIsCritical(true);
          if (data.message) setCustomMessage(data.message);
          setNeedRefresh(true);
          return;
        }

        // Re-prompt if the user previously postponed this same version.
        try {
          const postponed = localStorage.getItem(POSTPONED_VERSION_KEY);
          if (postponed && postponed === data.version) {
            const savedMsg = localStorage.getItem(POSTPONED_MESSAGE_KEY);
            setCustomMessage(savedMsg ?? data.message ?? null);
            setIsCritical(false);
            setNeedRefresh(true);
          }
        } catch {
          /* ignore storage errors */
        }
        return;
      }
      if (lastSeenVersionRef.current !== data.version) {
        lastSeenVersionRef.current = data.version;
        // New version supersedes any previously postponed one.
        try {
          localStorage.removeItem(POSTPONED_VERSION_KEY);
          localStorage.removeItem(POSTPONED_MESSAGE_KEY);
        } catch {
          /* ignore */
        }
        setNeedRefresh(true);
        setIsCritical(!!data.critical);
        setCustomMessage(data.message ?? null);
      }
    };

    const fetchVersion = async () => {
      const { data, error } = await supabase
        .from("app_version")
        .select("version, critical, message")
        .eq("id", true)
        .maybeSingle();
      if (!error && data) apply(data);
    };

    fetchVersion();
    const id = window.setInterval(fetchVersion, UPDATE_CHECK_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchVersion();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Realtime: react instantly when an admin updates the row.
    const channel = supabase
      .channel("app_version_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_version" },
        (payload) => {
          const next = payload.new as {
            version: string;
            critical: boolean;
            message: string | null;
          };
          if (next) apply(next);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [setNeedRefresh]);

  const hardReload = () => {
    // Cache-bust query param garante que o navegador busque o HTML novo,
    // ignorando qualquer cache HTTP/SW residual.
    const url = new URL(window.location.href);
    url.searchParams.set("_v", Date.now().toString());
    window.location.replace(url.toString());
  };

  const handleUpdate = async () => {
    setUpdating(true);

    // Clear postponed reminder — user is updating now.
    try {
      localStorage.removeItem(POSTPONED_VERSION_KEY);
      localStorage.removeItem(POSTPONED_MESSAGE_KEY);
    } catch {
      /* ignore */
    }

    // Limpa caches do navegador (best-effort).
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* ignore */
    }

    // Tenta desregistrar SWs para garantir que o próximo load pegue tudo novo.
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
      }
    } catch {
      /* ignore */
    }

    // updateServiceWorker(true) só resolve quando existe um SW em "waiting".
    // Quando a versão é trocada apenas via DB (sem redeploy), isso nunca
    // resolve e o botão fica girando para sempre. Garantimos um reload
    // após um timeout curto como fallback.
    const fallback = window.setTimeout(hardReload, 1500);
    try {
      await updateServiceWorker(true);
    } catch {
      /* ignore */
    } finally {
      clearTimeout(fallback);
      hardReload();
    }
  };

  const handleDismiss = () => {
    if (isCritical) return;
    // Persist the postponed version so we re-prompt on the next load.
    try {
      const v = pendingVersionRef.current ?? lastSeenVersionRef.current;
      if (v) {
        localStorage.setItem(POSTPONED_VERSION_KEY, v);
        if (customMessage) {
          localStorage.setItem(POSTPONED_MESSAGE_KEY, customMessage);
        } else {
          localStorage.removeItem(POSTPONED_MESSAGE_KEY);
        }
      }
    } catch {
      /* ignore */
    }
    setNeedRefresh(false);
  };

  return (
    <AlertDialog
      open={needRefresh}
      onOpenChange={(next) => {
        if (!next) handleDismiss();
      }}
    >
      <AlertDialogContent
        className="max-w-md"
        onEscapeKeyDown={(e) => {
          if (isCritical) e.preventDefault();
        }}
      >
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div
              className={
                "h-14 w-14 rounded-full flex items-center justify-center " +
                (isCritical ? "bg-destructive/10" : "bg-primary/10")
              }
            >
              {isCritical ? (
                <AlertTriangle className="h-7 w-7 text-destructive" />
              ) : (
                <Sparkles className="h-7 w-7 text-primary" />
              )}
            </div>
          </div>
          <AlertDialogTitle className="text-center text-xl">
            {isCritical ? "Atualização obrigatória" : "Nova versão disponível"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {customMessage
              ? customMessage
              : isCritical
              ? "Uma atualização crítica do Zenit está disponível. Atualize agora para continuar usando o sistema com segurança."
              : "Atualize para receber as últimas melhorias e correções do Zenit."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2">
          {!isCritical && (
            <Button
              variant="outline"
              onClick={handleDismiss}
              disabled={updating}
              className="w-full sm:w-auto"
            >
              Mais tarde
            </Button>
          )}
          <Button
            onClick={handleUpdate}
            disabled={updating}
            className="w-full sm:w-auto"
            size="lg"
          >
            <RefreshCw
              className={"h-4 w-4 mr-2 " + (updating ? "animate-spin" : "")}
            />
            {updating ? "Atualizando..." : "Atualizar agora"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AppUpdatePrompt;
