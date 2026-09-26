// Reads an Event's live CVS status. The status labels, and what each one means for the checker,
// are listed under "cvsStatuses" in src/data/eventSupportRules.json.

// Case, spacing and the kind of dash are ignored ("Not assessed – Out of scope" appears with an
// en dash in CVS training material and with a hyphen on the CVS site). Nothing else is.
export const normalizeCvsStatus = (value) => (typeof value === 'string'
  ? value.replace(/[‐-―−]/g, '-').trim().replace(/\s+/g, ' ').toLowerCase()
  : '');

/**
 * 'exempt' | 'positive' | 'negative' | 'not-assessed' | 'pre-cleared' | 'pending' | 'unknown'
 */
export function classifyCvsStatus(data, raw) {
  const status = normalizeCvsStatus(raw);
  if (!status) return 'unknown';
  const listed = (labels) => labels.some((label) => normalizeCvsStatus(label) === status);
  const { exempt, positive, negative, notAssessed, preCleared, pending } = data.cvsStatuses;
  if (listed(exempt)) return 'exempt';
  if (listed(positive)) return 'positive';
  if (listed(negative)) return 'negative';
  if (listed(notAssessed)) return 'not-assessed';
  if (listed(preCleared)) return 'pre-cleared';
  if (listed(pending)) return 'pending';
  return 'unknown';
}

/**
 * A precaution requested for this checker, separate from the Code's rules: when the company
 * says a third-party Event's Delegates are all local (a national Event, outside CVS scope) but
 * the Event has a CVS record, warn unless the record's whole status is one of the two
 * "Not assessed" labels that confirm the Event is outside CVS scope.
 */
export function getCvsScopeWarning(data, ctx, answers, evidence) {
  if (!ctx.thirdParty || ctx.virtual || answers.audience !== 'local' || !evidence) return null;
  const state = classifyCvsStatus(data, evidence.status?.raw);
  if (state === 'exempt') return null;
  let messageId = 'nationalRecordPending';
  if (state === 'negative') messageId = 'nationalRecordNegative';
  if (state === 'positive') messageId = 'nationalRecordPositive';
  return {
    id: 'national-cvs-record',
    titleId: 'nationalRecordTitle',
    messageId,
    noteId: 'nationalRecordNote',
    params: { status: evidence.status.raw },
  };
}

export function getScopeUnconfirmedWarning(ctx, answers, evidence) {
  if (!ctx.thirdParty || ctx.virtual || answers.audience !== 'local' || evidence) return null;
  return { id: 'scope-unconfirmed', titleId: 'scopeUnconfirmedTitle', messageId: 'scopeUnconfirmed' };
}
