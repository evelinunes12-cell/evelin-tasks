import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

// How often (ms) to check for a new service worker / new build
const UPDATE_CHECK_INTERVAL = 60 * 1000; // 1 minute

/**
 * Listens for new app versions deployed to production and prompts
 * the user to refresh. Works for both web and installed PWA (mobile/desktop).
 *
 * - Uses vite-plugin-pwa's autoUpdate to detect a new service worker waiting.
 * - Polls the SW registration every minute so long-lived sessions catch deploys.
 * - On accept: clears all caches, activates the new SW (skipWaiting) and reloads.
 */
const AppUpdatePrompt = () => {
  const toastIdRef = useRef<string | number | null>(null);
  const [, setReady] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      setReady(true);
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

  useEffect(() => {
    if (!needRefresh) return;
    if (toastIdRef.current !== null) return;

    const id = toast("Nova versão disponível", {
      description: "Atualize para receber as últimas melhorias do Zenit.",
      duration: Infinity,
      icon: <RefreshCw className="h-4 w-4 text-primary" />,
      action: (
        <Button
          size="sm"
          onClick={async () => {
            try {
              // Clear all caches so the next load fetches fresh assets
              if ("caches" in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
              }
            } catch {
              /* ignore */
            }
            // Activate the new SW and reload
            await updateServiceWorker(true);
          }}
        >
          Atualizar
        </Button>
      ),
      onDismiss: () => {
        toastIdRef.current = null;
        setNeedRefresh(false);
      },
      onAutoClose: () => {
        toastIdRef.current = null;
      },
    });
    toastIdRef.current = id;
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
};

export default AppUpdatePrompt;
