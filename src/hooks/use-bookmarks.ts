import { useEffect, useState } from "react";

const KEY = "khr_bookmarked_topics";

const readStored = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Per-device bookmarking (localStorage, no account required) for topic
// cards. Lightweight on purpose — no Supabase table/RLS needed for a
// save-for-later marker that doesn't need to sync across devices.
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>(readStored);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  const isBookmarked = (slug: string) => bookmarks.includes(slug);

  const toggle = (slug: string) => {
    setBookmarks(prev => (prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]));
  };

  return { bookmarks, isBookmarked, toggle };
}
