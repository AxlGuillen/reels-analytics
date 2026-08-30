import type { Metadata } from "next";
import { LandingPage } from "../../landing/landing-page";
import { landingMetadata } from "../../landing/content";
import { SetHtmlLang } from "../../landing/set-html-lang";

/** Landing pública en inglés. Mismo markup que `/landing`; solo cambian el
 *  copy (content.ts) y la metadata. */

export const metadata: Metadata = landingMetadata("en");

export default function LandingEn() {
  return (
    <>
      <SetHtmlLang lang="en" />
      <LandingPage lang="en" />
    </>
  );
}
