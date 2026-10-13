import { afterEach, describe, expect, it } from "vitest";
import { HOST_SOURCE } from "./protocol";
import { startIframeEmbed } from "./iframe";

describe("iframe embed", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("ignores a message from the wrong origin and posts only to the parent origin", () => {
    const posted: Array<{ data: { type?: string }; origin: string }> = [];
    startIframeEmbed({
      search: "?session=abc&parentOrigin=https%3A%2F%2Fshop.example",
      document,
      parent: {
        postMessage(message, origin) {
          posted.push({ data: message as { type?: string }, origin });
        },
      },
      addEventListener(type, listener) {
        window.addEventListener(type, listener);
      },
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://evil.example",
        data: {
          source: HOST_SOURCE,
          version: 1,
          sessionId: "abc",
          type: "init",
          config: { garment: "kurta" },
        },
      }),
    );
    expect(posted).toEqual([]);

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://shop.example",
        data: {
          source: HOST_SOURCE,
          version: 1,
          sessionId: "abc",
          type: "init",
          config: { garment: "shirt", displayUnits: "in" },
        },
      }),
    );
    expect(posted).toHaveLength(1);
    expect(posted[0]?.origin).toBe("https://shop.example");
    expect(posted[0]?.data).toMatchObject({
      source: "tailor-scan",
      type: "ready",
      payload: { sessionId: "abc" },
    });
    const text = document.querySelector("tailor-scan")?.shadowRoot?.textContent ?? "";
    expect(text).toContain("shirt");
    expect(text).toContain("display in");

    document.querySelector("tailor-scan")?.shadowRoot?.querySelector("button")?.click();
    expect(posted).toHaveLength(3);
    expect(posted[2]?.data).toMatchObject({
      type: "complete",
      sessionId: "abc",
      payload: { sessionId: "abc", schema: "tailor-scan.result.v1" },
    });
  });
});
