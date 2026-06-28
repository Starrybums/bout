import * as fs from "node:fs";
import type { NewsItem } from "../types/index";
import { SAMPLE_NEWS_PATH } from "../config/defaultConfig";

let cache: NewsItem[] | null = null;

export function loadNewsItems(): NewsItem[] {
  if (cache) return cache;
  const raw = fs.readFileSync(SAMPLE_NEWS_PATH, "utf-8");
  cache = JSON.parse(raw) as NewsItem[];
  return cache;
}

export function getRecentNews(hours = 48, referenceDate: Date = new Date()): NewsItem[] {
  const items = loadNewsItems();
  const windowStart = referenceDate.getTime() - hours * 60 * 60 * 1000;
  const recent = items.filter((n) => new Date(n.timestamp).getTime() >= windowStart);
  const pool = recent.length > 0 ? recent : items; // sample data fallback so the feed is never empty
  return [...pool].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function filterByAsset(items: NewsItem[], symbol: string): NewsItem[] {
  const upper = symbol.toUpperCase();
  return items.filter((n) => n.affectedAssets.map((a) => a.toUpperCase()).includes(upper));
}

export function filterByCategory(items: NewsItem[], category: string): NewsItem[] {
  return items.filter((n) => n.category.toLowerCase() === category.toLowerCase());
}
