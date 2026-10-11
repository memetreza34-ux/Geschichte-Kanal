function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Only new videos opt into the hard upload-description gate.
 * Older video.json files remain valid and are never rewritten by this module.
 */
export function validateYoutubeUpload(meta, policy = {}) {
  const upload = meta?.youtubeUpload ?? {};
  if (Number(upload.captionPolicyVersion ?? 0) < 2) {
    return { passed: true, errors: [], legacy: true };
  }
  const rules = policy.uploadRules ?? policy;
  const min = Number(rules.minimumDescriptionCharacters ?? 450);
  const max = Number(rules.maximumDescriptionCharacters ?? 1400);
  const minParagraphs = Number(rules.minimumDescriptionParagraphs ?? 2);
  const count = Number(rules.requiredHashtagCount ?? 5);
  const title = clean(upload.title);
  const description = clean(upload.description);
  const paragraphs = description.split(/\n\s*\n/).map(clean).filter(Boolean);
  const hashtags = Array.isArray(upload.hashtags) ? upload.hashtags.map(clean).filter(Boolean) : [];
  const errors = [];

  if (!title) errors.push('Caption V2: youtubeUpload.title fehlt.');
  if (description.length < min || description.length > max) {
    errors.push(`Caption V2: Beschreibung braucht ${min}–${max} Zeichen; aktuell ${description.length}.`);
  }
  if (paragraphs.length < minParagraphs) {
    errors.push(`Caption V2: Beschreibung braucht mindestens ${minParagraphs} inhaltliche Absätze.`);
  }
  if (/#\S+/.test(description)) errors.push('Caption V2: Hashtags separat in youtubeUpload.hashtags speichern.');
  if (hashtags.length !== count) errors.push(`Caption V2: genau ${count} Hashtags erforderlich.`);
  if (hashtags.some(tag => !/^#[\p{L}\p{N}_]+$/u.test(tag))) {
    errors.push('Caption V2: Jeder Hashtag muss mit # anfangen und darf keine Leerzeichen enthalten.');
  }
  if (new Set(hashtags.map(tag => tag.toLocaleLowerCase('de'))).size !== hashtags.length) {
    errors.push('Caption V2: Hashtags müssen eindeutig sein.');
  }
  return { passed: errors.length === 0, errors, legacy: false };
}
