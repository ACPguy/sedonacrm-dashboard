// components/shared/IssuesTable.jsx
// Single source of truth for the Issues table — used in left nav AND property/tenant detail.
// Source lives in IssuesView.jsx. This file is the standard import point.
//
// Props:
//   issues             (array)   — issue records to display
//   setIssues          (fn)      — state setter for optimistic Kanban drag updates
//   loading            (bool)
//   error              (string)
//   onSelect           (fn)      — called with the issue record when a row is clicked
//   filterPropCode     (string)  — client-side filter; only show issues for this prop
//   hidePropertyFilter (bool)    — hides the property strip (use inside property detail)
//   hideSearch         (bool)    — hides search bar

export { IssuesList as default, IssuesList } from '../IssuesView';
