"use client";

import { useEffect } from "react";

// Executes an arbitrary tracking snippet a producer pasted for their own
// product page (Meta Pixel, Google Ads, TikTok Pixel, UTMify, etc).
// <script> tags set via innerHTML never execute in the browser, so each
// one is recreated as a real DOM node; anything else (like the <noscript>
// fallback <img> some pixels ship) is inserted as plain markup.
export function TrackingScriptInjector({ html }: { html: string }) {
  useEffect(() => {
    if (!html) return;

    const container = document.createElement("div");
    container.innerHTML = html;
    const injectedNodes: Node[] = [];

    for (const node of Array.from(container.childNodes)) {
      if (node.nodeName === "SCRIPT") {
        const original = node as HTMLScriptElement;
        const script = document.createElement("script");
        for (const attr of Array.from(original.attributes)) {
          script.setAttribute(attr.name, attr.value);
        }
        script.text = original.text;
        document.body.appendChild(script);
        injectedNodes.push(script);
      } else {
        document.body.appendChild(node);
        injectedNodes.push(node);
      }
    }

    return () => {
      for (const node of injectedNodes) {
        node.parentNode?.removeChild(node);
      }
    };
  }, [html]);

  return null;
}
