// components/shared/WorkOrdersTable.jsx
// Single source of truth for the Work Orders table — used in left nav AND property/tenant detail.
// Source lives in WorkOrdersView.jsx. This file is the standard import point.
//
// Props:
//   wos                (array)   — work order records to display
//   setWos             (fn)      — state setter for optimistic Kanban drag updates
//   loading            (bool)
//   error              (string)
//   onSelect           (fn)      — called with the WO record when a row is clicked
//   filterPropCode     (string)  — client-side filter; only show WOs for this prop
//   hidePropertyFilter (bool)    — hides the property strip (use inside property detail)
//   hideSearch         (bool)    — hides search bar

export { WorkOrdersList as default, WorkOrdersList } from '../WorkOrdersView';
