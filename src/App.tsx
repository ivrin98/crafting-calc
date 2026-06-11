import { useEffect, useMemo, useState } from "react";
import RecipeGraph from "./components/RecipeGraph";
import {
  resolveRecipe,
  finalizeResolvedResult,
  type ResolveResult,
} from "./utils/resolver";
import type { Recipe, RecipeMap } from "./types";

const recipeModules = import.meta.glob("./Recipes/**/*.json", {
  eager: true,
  import: "default",
});

type SelectedRecipe = {
  id: string;
  item: string;
  qty: number;
};

function normalizeFileName(name: string): string {
  return name
    .replace(/\.json$/i, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function loadRecipes(): RecipeMap {
  const recipes: RecipeMap = {};

  for (const [path, recipe] of Object.entries(recipeModules)) {
    const fileName = path.split("/").pop();
    if (!fileName) continue;

    recipes[normalizeFileName(fileName)] = recipe as Recipe;
  }

  return recipes;
}

function createEmptyResult(): ResolveResult {
  return {
    raw: {},
    craftable: {},
  };
}

export default function App() {
  const recipes = useMemo(() => loadRecipes(), []);
  const itemNames = useMemo(() => Object.keys(recipes).sort(), [recipes]);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("recipeCrafterDarkMode") === "true";
  });

  const [selectedRecipes, setSelectedRecipes] = useState<SelectedRecipe[]>(() => {
    const saved = localStorage.getItem("recipeCrafterSelectedRecipes");

    if (saved) {
      return JSON.parse(saved);
    }

    return [
      {
        id: crypto.randomUUID(),
        item: itemNames[0] ?? "",
        qty: 1,
      },
    ];
  });

  const [inventory, setInventory] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("recipeCrafterInventory");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem("recipeCrafterDarkMode", String(darkMode));
    document.body.className = darkMode ? "dark" : "";
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(
      "recipeCrafterSelectedRecipes",
      JSON.stringify(selectedRecipes)
    );
  }, [selectedRecipes]);

  useEffect(() => {
    localStorage.setItem(
      "recipeCrafterInventory",
      JSON.stringify(inventory)
    );
  }, [inventory]);

  const resolved = useMemo(() => {
    const result = createEmptyResult();

    for (const selected of selectedRecipes) {
      if (!selected.item) continue;

      resolveRecipe(selected.item, selected.qty, recipes, inventory, result);
    }

    return finalizeResolvedResult(result, recipes, inventory);
  }, [selectedRecipes, recipes, inventory]);

  const rawRows = Object.values(resolved.raw).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const craftableRows = Object.values(resolved.craftable).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  function updateSelectedRecipe(id: string, patch: Partial<SelectedRecipe>) {
    setSelectedRecipes((prev) =>
      prev.map((recipe) =>
        recipe.id === id ? { ...recipe, ...patch } : recipe
      )
    );
  }

  function addSelectedRecipe() {
    setSelectedRecipes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        item: itemNames[0] ?? "",
        qty: 1,
      },
    ]);
  }

  function removeSelectedRecipe(id: string) {
    setSelectedRecipes((prev) =>
      prev.length === 1 ? prev : prev.filter((recipe) => recipe.id !== id)
    );
  }

  function updateInventory(name: string, value: number) {
    setInventory((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function resetProgress() {
    localStorage.removeItem("recipeCrafterSelectedRecipes");
    localStorage.removeItem("recipeCrafterInventory");

    setSelectedRecipes([
      {
        id: crypto.randomUUID(),
        item: itemNames[0] ?? "",
        qty: 1,
      },
    ]);

    setInventory({});
  }

  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h1>Recipe Crafter</h1>

        <div>
          <button type="button" onClick={() => setDarkMode((prev) => !prev)}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>

          <button
            type="button"
            onClick={resetProgress}
            style={{ marginLeft: 8 }}
          >
            Reset Progress
          </button>
        </div>
      </div>

      <h2>Recipes to Make</h2>

      {selectedRecipes.map((selected) => {
        const selectedRecipe = recipes[selected.item];

        return (
          <div key={selected.id} className="selected-recipe-row">
            <select
              value={selected.item}
              onChange={(e) =>
                updateSelectedRecipe(selected.id, { item: e.target.value })
              }
            >
              {itemNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              value={selected.qty}
              onChange={(e) =>
                updateSelectedRecipe(selected.id, {
                  qty: Math.max(1, Number(e.target.value) || 1),
                })
              }
            />

            {selectedRecipe && (
              <span>
                Success: {selectedRecipe.success_rate}% | Output:{" "}
                {selectedRecipe.outputqty}
              </span>
            )}

            <button
              type="button"
              onClick={() => removeSelectedRecipe(selected.id)}
              disabled={selectedRecipes.length === 1}
            >
              Remove
            </button>
          </div>
        );
      })}

      <button type="button" onClick={addSelectedRecipe}>
        Add Recipe
      </button>
   <div className="materials-wrapper">
  <div className="materials-section">
    <h2>Craftable Materials</h2>

    <table className="materials-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Needed</th>
          <th>I Have</th>
          <th>Still Need Item</th>
          <th>Can Craft</th>
          <th>Output</th>
          <th>Crafts</th>
        </tr>
      </thead>

      <tbody>
        {craftableRows.map((row) => (
          <tr key={row.name}>
            <td>{row.name}</td>
            <td>{row.needed}</td>
            <td>
              <input
                type="number"
                min={0}
                value={inventory[row.name] || ""}
                onChange={(e) =>
                  updateInventory(row.name, Number(e.target.value) || 0)
                }
              />
            </td>
            <td>{row.missing}</td>
            <td>{row.craftableFromOwnedRaw || 0}</td>
            <td>{row.outputqty}</td>
            <td>{row.crafts}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  <div className="materials-section">
    <h2>Raw Materials</h2>

    <table className="materials-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Needed</th>
          <th>I Have</th>
          <th>Still Need</th>
        </tr>
      </thead>

      <tbody>
        {rawRows.map((row) => (
          <tr key={row.name}>
            <td>{row.name}</td>
            <td>{row.needed}</td>
            <td>
              <input
                type="number"
                min={0}
                value={inventory[row.name] || ""}
                onChange={(e) =>
                  updateInventory(row.name, Number(e.target.value) || 0)
                }
              />
            </td>
            <td>{row.missing}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

      <h2>Recipe Trees</h2>

      <div className="recipe-tree-grid">
        {selectedRecipes.map((selected) => (
          <div key={selected.id} className="recipe-tree-panel">
            <h3>
              {selected.item} x{selected.qty}
            </h3>

            <RecipeGraph
              item={selected.item}
              recipes={recipes}
              quantity={selected.qty}
              inventory={inventory}
            />
          </div>
        ))}
      </div>
    </div>
  );
}