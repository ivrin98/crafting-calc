import type { RecipeMap } from "../types";
import { findRecipeKey, normalizeName } from "../utils/recipeLookup";

type Props = {
  item: string;
  quantity: number;
  recipes: RecipeMap;
  inventory: Record<string, number>;
};

export default function RecipeGraph({
  item,
  quantity,
  recipes,
  inventory,
}: Props) {
  function renderNode(itemName: string, requiredQty: number, depth = 0) {
    const normalized = normalizeName(itemName);
    const recipeKey = findRecipeKey(normalized, recipes);
    const recipe = recipeKey ? recipes[recipeKey] : undefined;

    const owned = inventory[normalized] || 0;
    const missing = Math.max(0, requiredQty - owned);
    const crafts = recipe ? Math.ceil(missing / recipe.outputqty) : 0;

    return (
      <div key={`${normalized}-${requiredQty}-${depth}`} className="tree-node">
        <div
          className={recipe ? "tree-card craftable" : "tree-card raw"}
          style={{ marginLeft: depth * 28 }}
        >
          <strong>{recipeKey ?? normalized}</strong>
          <span>Needed: {requiredQty}</span>
          <span>Owned: {owned}</span>
          <span>Missing: {missing}</span>

          {recipe ? (
            <>
              <span>Output: {recipe.outputqty}</span>
              <span>Crafts: {crafts}</span>
              <span>Success: {recipe.success_rate}%</span>
            </>
          ) : (
            <span>RAW</span>
          )}
        </div>

        {recipe &&
          missing > 0 &&
          Object.entries(recipe.materials).map(([materialName, materialQty]) =>
            renderNode(materialName, materialQty * crafts, depth + 1)
          )}
      </div>
    );
  }

  return <div className="recipe-tree">{renderNode(item, quantity)}</div>;
}