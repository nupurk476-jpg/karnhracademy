import { useRef, useState } from "react";

const MIN_FILL_TIME_MS = 1500;

/**
 * Zero-infrastructure spam deterrent for public forms (no captcha service
 * configured). Combines a hidden bait field bots tend to autofill with a
 * minimum-time trap, since most spam bots submit instantly on page load.
 */
export function useHoneypot() {
  const [honeypot, setHoneypot] = useState("");
  const renderedAt = useRef(Date.now());

  const isBot = () => honeypot.trim() !== "" || Date.now() - renderedAt.current < MIN_FILL_TIME_MS;

  const honeypotFieldProps = {
    type: "text",
    name: "company",
    value: honeypot,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setHoneypot(e.target.value),
    tabIndex: -1,
    autoComplete: "off",
    "aria-hidden": true,
    style: { position: "absolute" as const, left: "-9999px", width: 1, height: 1, opacity: 0 },
  };

  return { isBot, honeypotFieldProps };
}
