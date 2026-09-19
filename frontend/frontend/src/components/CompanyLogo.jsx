import { useState } from "react";
import { guessCompanyDomain } from "../lib/companyDomain";

// Real logos via Google's public favicon service — no API key required,
// and it already handles "does this domain even have a favicon" for us.
// A domain that previously failed to load is remembered so we never
// re-request (or re-flash) a broken image for the same company again.
const LOGO_SIZE = 128;
const failedDomains = new Set();

function logoUrlFor(domain) {
  return `https://www.google.com/s2/favicons?sz=${LOGO_SIZE}&domain=${encodeURIComponent(domain)}`;
}

function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/**
 * Real company logo with a graceful, cached fallback chain: official
 * favicon (via Google's favicon service, keyed off a best-effort domain
 * guess) → initials avatar. Never shows a broken image — a failed load
 * flips straight to initials and is remembered so it doesn't retry.
 */
export default function CompanyLogo({ company, size = 40, className = "" }) {
  const domain = guessCompanyDomain(company);
  const [imgErrored, setImgErrored] = useState(false);
  const failed = !domain || failedDomains.has(domain) || imgErrored;

  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.32) };

  if (failed) {
    return (
      <div
        style={style}
        className={`flex shrink-0 items-center justify-center rounded-2xl bg-[#F5F2FF] font-bold text-[#8B7CF6] ${className}`}
      >
        {initials(company)}
      </div>
    );
  }

  return (
    <div
      style={style}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#F5F2FF] ${className}`}
    >
      <img
        src={logoUrlFor(domain)}
        alt=""
        width={size * 0.65}
        height={size * 0.65}
        loading="lazy"
        onError={() => {
          failedDomains.add(domain);
          setImgErrored(true);
        }}
        className="object-contain"
      />
    </div>
  );
}
