/**
 * Grounding data for the satellite assistant's free-form questions
 * (api/ask.ts): a fact sheet from portfolio.ts and one entry per listed post.
 * Everything here is already public on the site.
 */
import { getCollection } from "astro:content";
import { getPostUrl } from "@/utils/getPostPaths";
import { postFilter } from "@/utils/postFilter";
import {
  identity,
  career,
  education,
  certifications,
  stages,
  cards,
  openSource,
} from "@/data/portfolio";

/** First prose paragraph of a post body, for retrieval and context. */
function lead(body = "") {
  const para = body
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .find(p => p && !/^(#|\*|!|```|\||<|-|>|\d+\.)/.test(p));
  return (para ?? "").replace(/\s+/g, " ").slice(0, 400);
}

function facts() {
  return [
    `Name: ${identity.name}. Title: ${identity.title}. ${identity.claim} ${identity.openTo}. ${identity.available}.`,
    "Career:",
    ...career.map(c => `- ${c.period}, ${c.role}, ${c.org}: ${c.bullets.join("; ")}`),
    "Education:",
    ...education.map(e => `- ${e.period}, ${e.degree}, ${e.school}`),
    `Certifications: ${certifications.map(c => c.name).join("; ")}`,
    "What he does, by stage:",
    ...stages.map(s => `- ${s.name}: ${s.governing} ${s.support}`),
    "Projects and contributions:",
    ...cards.map(c => `- ${c.title}: ${c.summary}`),
    "Open source:",
    ...openSource.map(o => `- ${o.headline}: ${o.did}`),
  ].join("\n");
}

export async function GET() {
  const posts = (await getCollection("posts"))
    .filter(p => postFilter(p) && !p.data.unlisted)
    .map(p => ({
      slug: p.id,
      url: getPostUrl(p.id, p.filePath),
      title: p.data.title,
      description: p.data.description ?? "",
      tags: p.data.tags,
      lead: lead(p.body),
    }));
  return new Response(JSON.stringify({ facts: facts(), posts }), {
    headers: { "Content-Type": "application/json" },
  });
}
