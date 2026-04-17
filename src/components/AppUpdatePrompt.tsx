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

// How often (ms) to check for a new service worker / new build
const UPDATE_CHECK_INTERVAL = 60 * 1000; // 1 minute

// URL of a JSON file we poll to detect critical updates.
// Place /public/version.json in the project with shape:
// { "version": "1.2.3", "critical": true, "message": "Optional custom message" }
const VERSION_MANIFEST_URL = "/version.json";

type VersionManifest = {
  version?: string;
  critical?: boolean;
  message?: string;
};

/**
 * Listens for new app versions deployed to production and prompts the user
 * with a modal (AlertDialog) — much more visible than a toast, especially
 * on mobile / installed PWA.
 *
 * - Uses vite-plugin-pwa's autoUpdate to detect a new service worker waiting.
 * - Polls /version.json every minute to detect a "critical" flag. When true,
 *   the modal is non-dismissible and the user MUST update to continue.
 * - On accept: clears all caches, activates the new SW (skipWaiting) and reloads.
 */
const AppUpdatePrompt = () => {
  const [isCritical, setIsCritical] = useState(false);
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const lastSeenVersionRef = useRef<string | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // Periodically ask the browser to check for a new SW
      const interval = window.setInterval(() => {
        registration.update().catch(() => {
          /* network errors are fine, will retry */
        });
      }, UPDATE_CHECK_INTERVAL);

      // Also re-check whenever the tab comes back to focus
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

  // Poll /version.json to detect critical updates independently of the SW lifecycle
  useEffect(() => {
    let cancelled = false;

    const checkManifest = async () => {
      try {
        const res = await fetch(`${VERSION_MANIFEST_URL}?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: VersionManifest = await res.json();
        if (cancelled) return;

        if (data.version) {
          if (lastSeenVersionRef.current === null) {
            lastSeenVersionRef.current = data.version;
          } else if (lastSeenVersionRef.current !== data.version) {
            // New version detected via manifest
            setNeedRefresh(true);
            if (data.critical) setIsCritical(true);
            if (data.message) setCustomMessage(data.message);
          }
        }
      } catch {
        /* offline or 404 — silently ignore */
      }
    };

    checkManifest();
    const id = window.setInterval(checkManifest, UPDATE_CHECK_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === "visible") checkManifest();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [setNeedRefresh]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* ignore */
    }
    try {
      await updateServiceWorker(true);
    } catch {
      // Fallback: hard reload if SW activation fails
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    if (isCritical) return; // cannot dismiss critical updates
    setNeedRefresh(false);
  };

  const open = needRefresh;

  return (
    <AlertDialog
      open={open}
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
