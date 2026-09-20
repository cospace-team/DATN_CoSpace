import DOMPurify from "dompurify";

/**
 * CSP enforces `require-trusted-types-for 'script'`, which means any plain
 * string assigned to a DOM XSS sink (innerHTML, etc.) is rejected unless it
 * passes through a Trusted Types policy first. Registering a policy named
 * "default" makes the browser route every such plain-string assignment
 * through it automatically, so existing call sites don't need to be
 * rewritten one by one — they just get sanitized instead of blocked.
 *
 * DOMPurify registers its own "dompurify" policy for the innerHTML write it
 * does internally while parsing; the CSP's trusted-types allowlist has to
 * name it too, or that write recurses back into this policy.
 */
if (typeof window !== "undefined" && window.trustedTypes?.createPolicy) {
  try {
    window.trustedTypes.createPolicy("default", {
      createHTML: (input: string) => DOMPurify.sanitize(input),
      createScriptURL: (input: string) => input,
      createScript: () => {
        throw new Error("Dynamic script creation is not allowed.");
      },
    });
  } catch {
    // A "default" policy can only be created once; ignore re-registration
    // (e.g. Vite HMR re-executing this module during development).
  }
}
