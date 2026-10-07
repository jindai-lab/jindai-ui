// Open a new browser window searching all bibliography items by author.
//
// The URL mirrors the bibliothek route's search params (query/type/item_type)
// so the new window runs exactly the same author search the in-page search
// box would.  itemType is the caller's current literature-type filter; it is
// only included when it differs from the route's default ("book").
export function openAuthorSearch(author, itemType) {
  if (!author) return;
  const params = new URLSearchParams();
  params.set("query", author);
  params.set("type", "author");
  if (itemType && itemType !== "book") params.set("item_type", itemType);
  window.open(`/bibliothek?${params.toString()}`, "_blank");
}