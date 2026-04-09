"use client";

import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";

interface IsolatedArticlePreviewProps {
  html: string;
  className?: string;
  onLoad?: () => void;
  /** When true, auto-scrolls to bottom as content grows (unless user scrolled up) */
  streaming?: boolean;
}

export interface IsolatedArticlePreviewRef {
  scrollToBottom: () => void;
  getIframe: () => HTMLIFrameElement | null;
  getScrollInfo: () => { scrollTop: number; scrollHeight: number; clientHeight: number } | null;
}

// Base HTML template — static shell, set once via srcDoc (never changes)
const SHELL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Reset styles for clean slate */
    *, *::before, *::after {
      box-sizing: border-box;
    }

    html {
      -webkit-text-size-adjust: 100%;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
    }

    /* Article container with proper padding */
    .scai-article-container {
      max-width: 768px;
      margin: 0 auto;
      padding: 2rem 0;
    }

    /* Responsive padding and width for mobile */
    @media (max-width: 768px) {
      .scai-article-container {
        max-width: 100%;
        padding: 1rem 0;
      }
    }

    @media (max-width: 480px) {
      .scai-article-container {
        max-width: 100%;
        padding: 0.75rem 0;
      }
    }

    /* Base typography */
    h1, h2, h3, h4, h5, h6 {
      margin-top: 0;
      line-height: 1.3;
    }

    p {
      margin-top: 0;
    }

    img {
      max-width: 100%;
      height: auto;
    }

    a {
      color: inherit;
    }

    /* Image captions - centered styling */
    figcaption {
      text-align: center;
      font-size: 0.875rem;
      color: #6b7280;
      margin-top: 0.75rem;
      font-style: italic;
      line-height: 1.4;
    }

    /* Spinner animation for loading images */
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Custom scrollbar for iframe */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: #f1f1f1;
    }

    ::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #a1a1a1;
    }
  </style>
</head>
<body>
  <div class="scai-article-container"></div>
  <script>
    // Track whether user has scrolled up (disable auto-scroll)
    let userScrolledUp = false;

    document.addEventListener('scroll', function() {
      const atBottom = (document.documentElement.scrollHeight - document.documentElement.scrollTop - document.documentElement.clientHeight) < 100;
      userScrolledUp = !atBottom;
      // Notify parent of scroll state
      window.parent.postMessage({ type: 'iframe-scroll', userScrolledUp, atBottom }, '*');
    });

    // Listen for content injection + auto-scroll commands from parent
    window.addEventListener('message', function(e) {
      if (e.data?.type === 'inject-html') {
        const container = document.querySelector('.scai-article-container');
        if (container) {
          // Inject article styles into <head> if present in the html
          const styleMatch = e.data.html.match(/<style>([\\s\\S]*?)<\\/style>/i);
          let existingStyleEl = document.getElementById('scai-injected-styles');
          if (styleMatch) {
            if (!existingStyleEl) {
              existingStyleEl = document.createElement('style');
              existingStyleEl.id = 'scai-injected-styles';
              document.head.appendChild(existingStyleEl);
            }
            existingStyleEl.textContent = styleMatch[1];
          }

          container.innerHTML = e.data.html;
        }
      }
      if (e.data?.type === 'auto-scroll') {
        if (!userScrolledUp) {
          document.documentElement.scrollTop = document.documentElement.scrollHeight;
        }
      }
      if (e.data?.type === 'reset-scroll') {
        userScrolledUp = false;
        document.documentElement.scrollTop = 0;
      }
    });

    // Notify parent when content is ready
    window.parent.postMessage({ type: 'iframe-loaded', height: document.body.scrollHeight }, '*');

    // Set up resize observer to handle dynamic content
    const resizeObserver = new ResizeObserver(() => {
      window.parent.postMessage({ type: 'iframe-resize', height: document.body.scrollHeight }, '*');
    });
    resizeObserver.observe(document.body);

    // Handle TOC anchor clicks - scroll to section smoothly
    document.addEventListener('click', function(e) {
      const target = e.target;
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const id = target.getAttribute('href').substring(1);
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  </script>
</body>
</html>`;

/**
 * IsolatedArticlePreview - Renders article HTML in an iframe for complete CSS isolation
 *
 * Uses DOM injection (postMessage) instead of srcDoc updates to preserve scroll position
 * during streaming. The iframe document is loaded once; subsequent html changes are
 * injected into the existing document without reloading it.
 */
export const IsolatedArticlePreview = forwardRef<
  IsolatedArticlePreviewRef,
  IsolatedArticlePreviewProps
>(function IsolatedArticlePreview({ html, className = "", onLoad, streaming = false }, ref) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReadyRef = useRef(false);
  const lastHtmlRef = useRef("");
  const pendingHtmlRef = useRef<string | null>(null);

  // Inject html into iframe via postMessage (preserves scroll position)
  const injectHtml = useCallback((content: string) => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: "inject-html", html: content }, "*");
    lastHtmlRef.current = content;
  }, []);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      iframeRef.current?.contentWindow?.postMessage({ type: "auto-scroll" }, "*");
    },
    getIframe: () => iframeRef.current,
    getScrollInfo: () => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return null;
      return {
        scrollTop: doc.documentElement.scrollTop,
        scrollHeight: doc.documentElement.scrollHeight,
        clientHeight: doc.documentElement.clientHeight,
      };
    },
  }));

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "iframe-loaded") {
        iframeReadyRef.current = true;
        onLoad?.();
        // Inject any html that arrived before the iframe was ready
        if (pendingHtmlRef.current !== null) {
          injectHtml(pendingHtmlRef.current);
          pendingHtmlRef.current = null;
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onLoad, injectHtml]);

  // Inject html when it changes (without reloading the iframe document)
  useEffect(() => {
    if (!html || html === lastHtmlRef.current) return;

    if (iframeReadyRef.current) {
      injectHtml(html);
      // Auto-scroll when streaming
      if (streaming) {
        iframeRef.current?.contentWindow?.postMessage({ type: "auto-scroll" }, "*");
      }
    } else {
      // Queue for injection once iframe is ready
      pendingHtmlRef.current = html;
    }
  }, [html, streaming, injectHtml]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={SHELL_TEMPLATE}
      className={`w-full border-0 ${className}`}
      style={{ height: "100%", minHeight: "100%" }}
      title="Article Preview"
      sandbox="allow-same-origin allow-scripts"
    />
  );
});

export default IsolatedArticlePreview;
