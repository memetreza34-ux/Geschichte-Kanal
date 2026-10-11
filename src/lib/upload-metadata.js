function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function list(values) {
  return Array.isArray(values) ? values.map(clean).filter(Boolean) : [];
}

/**
 * New upload-caption requirements are opt-in via youtubeUpload.captionPolicyVersion=2.
 * Existing videos without this field keep their original metadata and export format.
 */
export function validateYoutubeUpload(meta, policy = {}) {
  const upload = meta?.youtubeUpload ?? {};
  if (Number(upload.captionPolicyVersion ?? 0) < 2) return { passed: true, errors: [], legacy: true };

  const rules = policy?.uploadRules ?? policy ?? {};
  const minimum = Number(rules.minimumDescriptionCharacters ?? 450);
  const maximum = Number(rules.maximumDescriptionCharacters ?? 1400);
  const expectedHashtags = Number(rules.requiredHashtagCount ?? 5);
  const errors = [];
  const title = clean(upload.title);
  const description = clean(upload.description);
  const hashtags = list(upload.hashtags);
  const paragraphs = description.split(/\n\s*\n/).map(clean).filter(Boolean);

  if (!title) errors.push('YouTube-Caption V2: youtubeUpload.title fehlt.');
  if (description.length < minimum || description.length > maximum) {
    errors.push(`YouTube-Caption V2: Beschreibung muss ${minimum}–${maximum} Zeichen haben; aktuell ${description.length}.`);
  }
  if (paragraphs.length < 2) errors.push('YouTube-Caption V2: Beschreibung benötigt mindestens 2 verständliche Absätze.');
  if (/#\S+/.test(description)) errors.push('YouTube-Caption V2: Hashtags gehören in youtubeUpload.hashtags, nicht in die Beschreibung.');
  if (hashtags.length !== expectedHashtags) {
    errors.push(`YouTube-Caption V2: genau ${expectedHashtags} passende Hashtags benötigt, aktuell ${hashtags.length}.`);
  }
  if (hashtags.some((tag) => !/^#[\p{L}\p{N}_]+$/u.test(tag))) {
    errors.push('YouTube-Caption V2: Hashtags brauchen # und dürfen keine Leerzeichen enthalten.');
  }
  if (new Set(hashtags.map((tag) => tag.toLocaleLowerCase('de'))).size !== hashtags.length) {
    errors.push('YouTube-Caption V2: Hashtags dürfen nicht doppelt sein.');
  }
  return { passed: errors.length === 0, errors, legacy: false };
}

export function buildCaption(meta, policy = {}) {
  const upload = meta?.youtubeUpload ?? {};
  const title = clean(upload.title) || clean(meta?.title);
  const description = clean(upload.description) || (clean(meta?.topic) ? `In diesem Video geht es um ${clean(meta.topic)}.` : '');
  if (!title) throw new Error('YouTube-Titel fehlt in video.json (youtubeUpload.title oder title).');
  if (!description) throw new Error('YouTube-Beschreibung fehlt in video.json (youtubeUpload.description oder topic).');

  if (Number(upload.captionPolicyVersion ?? 0) >= 2) {
    const checked = validateYoutubeUpload(meta, policy);
    if (!checked.passed) throw new Error(checked.errors.join('\n'));
    // A directly copyable YouTube description: two or more paragraphs and exactly five hashtags.
    // Keywords and thumbnail text never belong in the new CAPTION.txt.
    return `TITLE:\n${title}\n\nDESCRIPTION:\n${description}\n\n${list(upload.hashtags).join(' ')}\n`;
  }

  // Legacy: old projects and their exports are intentionally preserved.
  const sections = ['TITLE:', title, '', 'DESCRIPTION:', description];
  const hashtags = list(upload.hashtags).join(' ');
  const keywords = list(upload.keywords).join(', ');
  const thumbnailText = clean(meta?.coverPolicy?.coverText);
  if (hashtags) sections.push('', 'HASHTAGS:', hashtags);
  if (keywords) sections.push('', 'KEYWORDS:', keywords);
  if (thumbnailText) sections.push('', 'THUMBNAIL_TEXT:', thumbnailText);
  return `${sections.join('\n')}\n`;
}
