import { useMemo, useState } from "react";

/** Client-side pagination for admin list tables — keeps the DOM small as rows grow. */
export function usePagination<T>(items: T[], pageSize = 25) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const paged = useMemo(
    () => items.slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    [items, clampedPage, pageSize]
  );
  return { page: clampedPage, pageCount, setPage, paged, pageSize };
}
