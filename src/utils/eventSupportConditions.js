export const isSupportService = (a) => a.activity === 'satellite' || a.activity === 'proctorship'
  || (['direct-faculty', 'company-meeting'].includes(a.activity) && ['main-faculty', 'satellite', 'booth', 'company-faculty'].includes(a.role));

export function getConditionGroups(data, a) {
  const activity = data.activities.find((item) => item.id === a.activity);
  const groups = new Set(['all', activity?.group]);
  if (!['items', 'demos', 'research'].includes(a.activity)) groups.add('event');
  // Main-programme faculty are not converted into company consultants by a fee.
  if (!isSupportService(a)) groups.delete('consulting');
  if (isSupportService(a)) groups.add('consulting');
  if (a.activity === 'company-meeting') groups.add('company');
  if (a.expenses?.some((expense) => ['travel', 'accommodation'].includes(expense))) groups.add('expenses');
  if (a.expenses?.includes('meals')) {
    groups.add('expenses');
    if (a.overlap === 'yes' || ['satellite', 'booth'].includes(a.role) || a.activity === 'satellite') groups.add('meal');
  }
  if (a.intermediary === 'yes') groups.add('intermediary');
  return groups;
}

export function getApplicableConditions(data, a) {
  const groups = getConditionGroups(data, a);
  return data.conditions.filter((condition) => condition.groups.some((group) => groups.has(group))
    && !(a.format === 'virtual' && condition.id === 'venue'));
}
