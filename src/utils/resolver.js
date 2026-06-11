import { findRecipeKey, normalizeName } from "./recipeLookup";
function getOwned(name, inventory) {
    const normalized = normalizeName(name);
    return (inventory[name] ||
        inventory[normalized] ||
        inventory[name.toLowerCase()] ||
        0);
}
function addRow(target, row) {
    const current = target[row.name];
    target[row.name] = {
        ...row,
        needed: (current?.needed || 0) + row.needed,
        owned: 0,
        missing: 0,
        crafts: (current?.crafts || 0) + (row.crafts || 0),
        craftableFromOwnedRaw: 0,
    };
}
function calculateCraftableFromOwnedRaw(itemName, recipes, inventory) {
    const recipeKey = findRecipeKey(itemName, recipes);
    if (!recipeKey)
        return 0;
    const recipe = recipes[recipeKey];
    let maxCrafts = Infinity;
    let hasRawMaterial = false;
    for (const [materialName, materialQty] of Object.entries(recipe.materials)) {
        const normalizedMaterial = normalizeName(materialName);
        const materialRecipeKey = findRecipeKey(normalizedMaterial, recipes);
        if (materialRecipeKey)
            continue;
        hasRawMaterial = true;
        const ownedMaterial = getOwned(normalizedMaterial, inventory);
        const possibleCrafts = Math.floor(ownedMaterial / materialQty);
        maxCrafts = Math.min(maxCrafts, possibleCrafts);
    }
    if (!hasRawMaterial || maxCrafts === Infinity)
        return 0;
    return maxCrafts * recipe.outputqty;
}
export function resolveRecipe(itemName, requiredQty, recipes, inventory = {}, result = {
    raw: {},
    craftable: {},
}) {
    const normalized = normalizeName(itemName);
    const recipeKey = findRecipeKey(normalized, recipes);
    if (!recipeKey) {
        addRow(result.raw, {
            name: normalized,
            needed: requiredQty,
            owned: 0,
            missing: 0,
            craftable: false,
        });
        return result;
    }
    const recipe = recipes[recipeKey];
    const ownedCraftable = getOwned(recipeKey, inventory);
    const missingCraftable = Math.max(0, requiredQty - ownedCraftable);
    const crafts = Math.ceil(missingCraftable / recipe.outputqty);
    addRow(result.craftable, {
        name: recipeKey,
        needed: requiredQty,
        owned: 0,
        missing: 0,
        craftable: true,
        outputqty: recipe.outputqty,
        crafts,
    });
    if (crafts <= 0)
        return result;
    for (const [materialName, materialQty] of Object.entries(recipe.materials)) {
        resolveRecipe(materialName, materialQty * crafts, recipes, inventory, result);
    }
    return result;
}
export function finalizeResolvedResult(result, recipes, inventory) {
    for (const row of Object.values(result.raw)) {
        row.owned = getOwned(row.name, inventory);
        row.missing = Math.max(0, row.needed - row.owned);
    }
    for (const row of Object.values(result.craftable)) {
        row.owned = getOwned(row.name, inventory);
        row.missing = Math.max(0, row.needed - row.owned);
        row.craftableFromOwnedRaw = calculateCraftableFromOwnedRaw(row.name, recipes, inventory);
    }
    return result;
}
