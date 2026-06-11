import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { findRecipeKey, normalizeName } from "../utils/recipeLookup";
export default function RecipeGraph({ item, quantity, recipes, inventory, }) {
    function renderNode(itemName, requiredQty, depth = 0) {
        const normalized = normalizeName(itemName);
        const recipeKey = findRecipeKey(normalized, recipes);
        const recipe = recipeKey ? recipes[recipeKey] : undefined;
        const owned = inventory[normalized] || 0;
        const missing = Math.max(0, requiredQty - owned);
        const crafts = recipe ? Math.ceil(missing / recipe.outputqty) : 0;
        return (_jsxs("div", { className: "tree-node", children: [_jsxs("div", { className: recipe ? "tree-card craftable" : "tree-card raw", style: { marginLeft: depth * 28 }, children: [_jsx("strong", { children: recipeKey ?? normalized }), _jsxs("span", { children: ["Needed: ", requiredQty] }), _jsxs("span", { children: ["Owned: ", owned] }), _jsxs("span", { children: ["Missing: ", missing] }), recipe ? (_jsxs(_Fragment, { children: [_jsxs("span", { children: ["Output: ", recipe.outputqty] }), _jsxs("span", { children: ["Crafts: ", crafts] }), _jsxs("span", { children: ["Success: ", recipe.success_rate, "%"] })] })) : (_jsx("span", { children: "RAW" }))] }), recipe &&
                    missing > 0 &&
                    Object.entries(recipe.materials).map(([materialName, materialQty]) => renderNode(materialName, materialQty * crafts, depth + 1))] }, `${normalized}-${requiredQty}-${depth}`));
    }
    return _jsx("div", { className: "recipe-tree", children: renderNode(item, quantity) });
}
