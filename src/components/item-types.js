// Canonical list of supported item types (Zotero-style camelCase values).
// Kept outside of any component file so react-refresh fast refresh stays
// happy (component files may only export components).
export const itemTypeValues = [
  'book',
  'journalArticle',
  'magazineArticle',
  'newspaperArticle',
  'thesis',
  'letter',
  'manuscript',
  'invoice',
  'email',
  'instantMessage',
  'forumPost',
  'blogPost',
  'podcast',
  'videoRecording',
  'audioRecording',
  'conferencePaper',
  'document',
  'encyclopediaArticle',
  'dictionaryEntry',
];

// Translated { label, value } options for Select components.
export const getItemTypeOptions = (t) =>
  itemTypeValues.map((value) => ({ label: t(`item_type_${value}`), value }));

// Display an item type in the current language; unknown values (e.g. from
// external syncs) are returned as-is, empty values become the "unknown" label.
export const formatItemType = (t, value) => {
  if (!value) return t("unknown_item_type");
  return itemTypeValues.includes(value) ? t(`item_type_${value}`) : value;
};