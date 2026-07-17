// Hangul Jamo, Hiragana/Katakana, Hangul Compatibility Jamo, CJK Ideographs, Hangul Syllables
const CJK_PATTERN = /[ᄀ-ᇿ぀-ヿ㄰-㆏一-鿿가-힣]/g;

const WORDS_PER_MINUTE = 200;
const CJK_CHARS_PER_MINUTE = 500;

/**
 * Estimates reading time from a post's raw markdown body.
 * Counts CJK characters and space-separated words separately so
 * Korean/English mixed posts get a sane estimate.
 */
export function getReadingTime(body: string | undefined): string {
  if (!body) return "1 min read";

  const text = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1");

  const cjkChars = (text.match(CJK_PATTERN) ?? []).length;
  const words = text
    .replace(CJK_PATTERN, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  const minutes = Math.max(
    1,
    Math.round(words / WORDS_PER_MINUTE + cjkChars / CJK_CHARS_PER_MINUTE)
  );
  return `${minutes} min read`;
}
