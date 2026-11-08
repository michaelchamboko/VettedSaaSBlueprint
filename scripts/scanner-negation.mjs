const NEGATION_CUES = new Set([
  "no", "not", "never", "none", "cannot", "cant", "can't", "wont", "won't",
  "dont", "don't", "doesnt", "doesn't", "didnt", "didn't", "couldnt", "couldn't",
  "wouldnt", "wouldn't", "shouldnt", "shouldn't", "isnt", "isn't", "arent", "aren't",
  "wasnt", "wasn't", "werent", "weren't", "without", "unable", "fails", "fail",
  "failed", "refuse", "refuses", "avoid", "avoids",
]);

const ALLOWED_BETWEEN_NEGATION_AND_GUARANTEE = new Set([
  "fully", "always", "completely", "consistently", "really", "truly", "ever",
  "absolutely", "totally", "entirely", "likely", "possibly", "necessarily",
  "be", "been", "being", "a", "an", "the", "any", "all",
]);

export function isNegatedGuaranteeTerm(value, index) {
  const boundaryChars = [".", "?", "!", ";", ":", ","];
  let boundary = -1;
  for (const char of boundaryChars) {
    const found = value.lastIndexOf(char, index - 1);
    if (found > boundary) boundary = found;
  }
  const start = boundary === -1 ? 0 : boundary + 1;
  const prefix = value.slice(start, index);
  const tokens = prefix.trim().split(/\s+/).filter(Boolean);
  const recent = tokens.slice(-6);

  let negIndex = -1;
  let negationCount = 0;
  for (let i = recent.length - 1; i >= 0; i -= 1) {
    const normalized = recent[i].toLowerCase().replace(/[^a-z']/g, "");
    if (NEGATION_CUES.has(normalized)) {
      negationCount += 1;
      if (negIndex === -1) negIndex = i;
    }
  }
  if (negIndex === -1) return false;
  // Double negatives or negated commands are not simple denials.
  if (negationCount > 1) return false;

  const between = recent.slice(negIndex + 1);
  if (!between.every((token) => {
    const normalized = token.toLowerCase().replace(/[^a-z']/g, "");
    return ALLOWED_BETWEEN_NEGATION_AND_GUARANTEE.has(normalized);
  })) {
    return false;
  }
  return true;
}

export function hasFlaggablePatternMatch(pattern, value) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const globalPattern = new RegExp(pattern.source, flags);
  let match;
  while ((match = globalPattern.exec(value)) !== null) {
    if (match.index === globalPattern.lastIndex) {
      globalPattern.lastIndex += 1;
    }
    const matchedText = match[0];
    if (/guarantee/i.test(matchedText) && isNegatedGuaranteeTerm(value, match.index)) {
      continue;
    }
    globalPattern.lastIndex = 0;
    return true;
  }
  globalPattern.lastIndex = 0;
  return false;
}
