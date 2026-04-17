import { useCallback, useEffect, useRef, useState } from "react";

// Document Picture-in-Picture API types
interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
  window: Window | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

export const isDocumentPiPSupported = (): boolean => {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
};

interface UseDocumentPiPOptions {
  width?: number;
  height?: number;
  onClose?: () => void;
}

/**
 * Hook to open a Document Picture-in-Picture window and render content into it.
 * Returns a `pipContainer` (HTMLElement | null) where you can portal React content,
 * plus `open`, `close`, and `isOpen` controls.
 */
export const useDocumentPiP = ({ width = 320, height = 360, onClose }: UseDocumentPiPOptions = {}) => {
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);

  const close = useCallback(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
    }
    pipWindowRef.current = null;
    setPipContainer(null);
    setIsOpen(false);
  }, []);

  const open = useCallback(async () => {
    if (!isDocumentPiPSupported()) {
      throw new Error("Document Picture-in-Picture não é suportado neste navegador.");
    }
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.focus();
      return;
    }

    const pipWindow = await window.documentPictureInPicture!.requestWindow({ width, height });
    pipWindowRef.current = pipWindow;

    // Copy stylesheets so Tailwind/design tokens work inside PiP
    [...document.styleSheets].forEach((sheet) => {
      try {
        const rules = [...(sheet.cssRules as any)].map((r) => r.cssText).join("");
        const style = pipWindow.document.createElement("style");
        style.textContent = rules;
        pipWindow.document.head.appendChild(style);
      } catch {
        // Cross-origin stylesheet — link it instead
        if (sheet.href) {
          const link = pipWindow.document.createElement("link");
          link.rel = "stylesheet";
          link.href = sheet.href;
          pipWindow.document.head.appendChild(link);
        }
      }
    });

    // Copy <html> and <body> classes for theme (dark/light)
    pipWindow.document.documentElement.className = document.documentElement.className;
    pipWindow.document.body.className = document.body.className;
    pipWindow.document.body.style.margin = "0";
    pipWindow.document.body.style.background = "hsl(var(--background))";

    const container = pipWindow.document.createElement("div");
    container.id = "pip-root";
    pipWindow.document.body.appendChild(container);

    pipWindow.addEventListener("pagehide", () => {
      pipWindowRef.current = null;
      setPipContainer(null);
      setIsOpen(false);
      onClose?.();
    });

    setPipContainer(container);
    setIsOpen(true);
  }, [width, height, onClose]);

  useEffect(() => {
    return () => {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }
    };
  }, []);

  return { open, close, isOpen, pipContainer, isSupported: isDocumentPiPSupported() };
};
