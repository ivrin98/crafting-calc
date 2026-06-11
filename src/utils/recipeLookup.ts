import type { RecipeMap } from "../types";

export function normalizeName(name: string): string {
  return name
    .replace(/\.json$/i, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function findRecipeKey(
  itemName: string,
  recipes: RecipeMap
): string | undefined {
  const normalized = normalizeName(itemName);

  if (recipes[normalized]) {
    return normalized;
  }

  const matches = Object.keys(recipes).filter((key) =>
    key.startsWith(normalized + " ")
  );

  if (matches.length === 1) {
    return matches[0];
  }

  return undefined;
}