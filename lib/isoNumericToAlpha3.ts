// ISO 3166-1 numeric → alpha-3 country codes, used to match world-atlas
// topojson features (keyed on numeric id) to our internal alpha-3 codes.
// Re-exported from the single source of truth in ./countries so the table is
// always complete and never drifts from the picker list.
export { ISO_N3_TO_A3 } from "./countries";
