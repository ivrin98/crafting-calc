export function normalizeName(name) {
    return name
        .replace(/\.json$/i, "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}
export function findRecipeKey(itemName, recipes) {
    const normalized = normalizeName(itemName);
    if (recipes[normalized]) {
        return normalized;
    }
    const matches = Object.keys(recipes).filter((key) => key.startsWith(normalized + " "));
    if (matches.length === 1) {
        return matches[0];
    }
    return undefined;
}
