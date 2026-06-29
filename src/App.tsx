import { useEffect, useMemo, useState } from "react";
import RecipeGraph from "./components/RecipeGraph";
import {
  resolveRecipe,
  finalizeResolvedResult,
  type ResolveResult,
} from "./utils/resolver";
import Select from "react-select";
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
  const itemNames = useMemo(
    () =>
      Object.keys(recipes).sort((a, b) =>
        getRecipeDisplayName(a, recipes).localeCompare(getRecipeDisplayName(b, recipes))
      ),
    [recipes]
  ); 

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

  const [costs, setCosts] = useState<Record<string, number>>({});

  function updateCost(itemName: string, value: string) {
    setCosts((prev) => ({
      ...prev,
      [itemName]: Number(value) || 0,
    }));
  }

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

  const selectedItems = new Set(selectedRecipes.map((r) => r.item));

  const craftableRows = Object.values(resolved.craftable)
    .filter((row) => !selectedItems.has(row.name))
    .sort((a, b) => a.name.localeCompare(b.name));


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

  function getRecipeDisplayName(name: string, recipes: RecipeMap): string {
  return recipes[name]?.display_name ?? name;
}

  const selectStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: "#1e1e1e",
      color: "#eee",
      borderColor: "#555",
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: "#1e1e1e",
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? "#333" : "#1e1e1e",
      color: "#eee",
    }),
    singleValue: (base: any) => ({
      ...base,
      color: "#eee",
    }),
    input: (base: any) => ({
      ...base,
      color: "#eee",
    }),
    placeholder: (base: any) => ({
      ...base,
      color: "#aaa",
    }),
  };

  const totalProjectedCost = [...rawRows, ...craftableRows].reduce(
    (sum, row) => sum + row.missing * (costs[row.name] ?? 0),
    0
  );

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

        const recipeOptions = itemNames.map((name) => ({
          value: name, // internal key
          label: getRecipeDisplayName(name, recipes), // user-facing name
        }));

        return (
          <div key={selected.id} className="selected-recipe-row">
            <div className="recipe-select-wrapper">
              <Select
                options={recipeOptions}
                value={recipeOptions.find(
                  (option) => option.value === selected.item
                )}
                onChange={(option) => {
                  if (option) {
                    updateSelectedRecipe(selected.id, {
                      item: option.value,
                    });
                  }
                }}
                isSearchable
                placeholder="Search recipe..."
                styles={selectStyles}
              />
            </div>

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

            <button onClick={() => removeSelectedRecipe(selected.id)}>
              Remove
            </button>
          </div>
        ); 
      })}

      <div className="recipe-total-cost">
        Total Cost: {totalProjectedCost.toLocaleString()}
      </div>

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
          <th>Owned</th>
          <th>Left to get</th>
          <th>Can Craft</th>
          <th>Output</th>
          <th>Crafts</th>
          <th>Cost Each</th>
          <th>Total Cost</th>
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
            <td>
              <input
                type="number"
                min={0}
                value={costs[row.name] ?? ""}
                onChange={(e) => updateCost(row.name, e.target.value)}
              />
            </td>

            <td>
              {(row.needed * (costs[row.name] ?? 0)).toLocaleString()}
            </td>
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
          <th>Owned</th>
          <th>Left to get</th>
          <th>Cost Each</th>
          <th>Total Cost</th>
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
            <td>
              <input
                type="number"
                min={0}
                value={costs[row.name] ?? ""}
                onChange={(e) => updateCost(row.name, e.target.value)}
              />
            </td>

            <td>
              {(row.needed * (costs[row.name] ?? 0)).toLocaleString()}
            </td>
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