// ─────────────────────────────────────────────────────────────────────────────
// RelationField.jsx — thin config-lookup wrapper around LinkField
// Looks up query/display config from lib/relations.js by `rel` key, spreads it
// into LinkField, then spreads caller props on top so call-site-specific
// props (value, onChange, mode, compact, hideTrigger, ref, excludeRef, etc.)
// still apply. LinkField itself is unchanged.
// ─────────────────────────────────────────────────────────────────────────────
import { forwardRef } from 'react';
import LinkField from './LinkField';
import { relations } from '../../lib/relations';

const RelationField = forwardRef(({ rel, ...rest }, ref) => {
  const config = relations[rel];
  if (!config) {
    // fail loud, not silent — a typo'd `rel` key should never render a
    // blank/broken field with no explanation
    console.error(`RelationField: no registry entry for rel="${rel}"`);
    return null;
  }
  return <LinkField ref={ref} {...config} {...rest} />;
});

export default RelationField;
