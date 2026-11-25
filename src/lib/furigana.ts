export type RubyToken =
  | { type: 'text'; text: string }
  | { type: 'ruby'; base: string; reading: string };

const RUBY_TAG_RE = /<ruby>([^<>]+?)<rt>([^<>]+?)<\/rt><\/ruby>/g;

/**
 * Safely tokenizes strictly `<ruby>BASE<rt>READING</rt></ruby>` segments without
 * injecting raw HTML into the DOM.
 */
export function parseRubyTokens(input: string): RubyToken[] {
  const tokens: RubyToken[] = [];
  let lastIndex = 0;
  RUBY_TAG_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = RUBY_TAG_RE.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', text: input.slice(lastIndex, match.index) });
    }
    tokens.push({
      type: 'ruby',
      base: match[1],
      reading: match[2],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    tokens.push({ type: 'text', text: input.slice(lastIndex) });
  }

  return tokens;
}

export function hasMalformedHtmlOutsideRuby(input: string): boolean {
  const stripped = input.replace(RUBY_TAG_RE, '');
  return stripped.includes('<') || stripped.includes('>');
}
