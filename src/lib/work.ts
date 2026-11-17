import { getCollection, type CollectionEntry } from "astro:content";

export type WorkEntry = CollectionEntry<"work">;

export async function getWork(): Promise<WorkEntry[]> {
  const all = await getCollection("work");
  return all.sort((a, b) => a.data.order - b.data.order);
}

export function caseStudies(entries: WorkEntry[]): WorkEntry[] {
  return entries.filter((entry) => entry.data.kind === "case-study");
}

export function explorations(entries: WorkEntry[]): WorkEntry[] {
  return entries.filter((entry) => entry.data.kind === "exploration");
}
