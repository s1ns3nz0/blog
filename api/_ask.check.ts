// Self-check for api/ask.ts: `node api/_ask.check.ts`
import assert from "node:assert/strict";
import { pickPosts, parseReply, type Post } from "./ask.ts";

const post = (slug: string, title: string, tags: string[] = []): Post => ({
  slug,
  url: `/posts/${slug}/`,
  title,
  description: "",
  tags,
  lead: "",
});
const posts = [
  post("lnd", "Running an LND Lightning Node on Kubernetes", ["lnd", "Lightning Network"]),
  post("prowler", "Adding a GCP check to Prowler", ["Prowler"]),
  post("kagent", "Diagnosing OpenCTI with Kagent", ["Kagent", "SRE"]),
];

assert.deepEqual(pickPosts("Has he run a Lightning node?", posts).map(p => p.slug), ["lnd"]);
assert.deepEqual(pickPosts("the and what", posts), []);
assert.equal(pickPosts("kagent sre lightning", posts, 1).length, 1);

const r = parseReply("He ran LND.\nSOURCES: lnd, made-up-post, lnd", posts);
assert.equal(r.answer, "He ran LND.");
assert.deepEqual(r.sources, [{ title: posts[0].title, url: "/posts/lnd/" }]);
assert.deepEqual(parseReply("No sources here.", posts), { answer: "No sources here.", sources: [] });

console.log("assistant helpers ok");
