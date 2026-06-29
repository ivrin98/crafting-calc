import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import RecipeGraph from "./components/RecipeGraph";
import { resolveRecipe, finalizeResolvedResult, } from "./utils/resolver";
import Select from "react-select";
const recipeModules = import.meta.glob("./Recipes/**/*.json", {
    eager: true,
    import: "default",
});
function normalizeFileName(name) {
    return name
        .replace(/\.json$/i, "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}
function loadRecipes() {
    const recipes = {};
    for (const [path, recipe] of Object.entries(recipeModules)) {
        const fileName = path.split("/").pop();
        if (!fileName)
            continue;
        recipes[normalizeFileName(fileName)] = recipe;
    }
    return recipes;
}
function createEmptyResult() {
    return {
        raw: {},
        craftable: {},
    };
}
export default function App() {
    const recipes = useMemo(() => loadRecipes(), []);
    const itemNames = useMemo(() => Object.keys(recipes).sort((a, b) => getRecipeDisplayName(a, recipes).localeCompare(getRecipeDisplayName(b, recipes))), [recipes]);
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem("recipeCrafterDarkMode") === "true";
    });
    const [selectedRecipes, setSelectedRecipes] = useState(() => {
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
    const [costs, setCosts] = useState({});
    function updateCost(itemName, value) {
        setCosts((prev) => ({
            ...prev,
            [itemName]: Number(value) || 0,
        }));
    }
    const [inventory, setInventory] = useState(() => {
        const saved = localStorage.getItem("recipeCrafterInventory");
        return saved ? JSON.parse(saved) : {};
    });
    useEffect(() => {
        localStorage.setItem("recipeCrafterDarkMode", String(darkMode));
        document.body.className = darkMode ? "dark" : "";
    }, [darkMode]);
    useEffect(() => {
        localStorage.setItem("recipeCrafterSelectedRecipes", JSON.stringify(selectedRecipes));
    }, [selectedRecipes]);
    useEffect(() => {
        localStorage.setItem("recipeCrafterInventory", JSON.stringify(inventory));
    }, [inventory]);
    const resolved = useMemo(() => {
        const result = createEmptyResult();
        for (const selected of selectedRecipes) {
            if (!selected.item)
                continue;
            resolveRecipe(selected.item, selected.qty, recipes, inventory, result);
        }
        return finalizeResolvedResult(result, recipes, inventory);
    }, [selectedRecipes, recipes, inventory]);
    const rawRows = Object.values(resolved.raw).sort((a, b) => a.name.localeCompare(b.name));
    const selectedItems = new Set(selectedRecipes.map((r) => r.item));
    const craftableRows = Object.values(resolved.craftable)
        .filter((row) => !selectedItems.has(row.name))
        .sort((a, b) => a.name.localeCompare(b.name));
    function updateSelectedRecipe(id, patch) {
        setSelectedRecipes((prev) => prev.map((recipe) => recipe.id === id ? { ...recipe, ...patch } : recipe));
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
    function removeSelectedRecipe(id) {
        setSelectedRecipes((prev) => prev.length === 1 ? prev : prev.filter((recipe) => recipe.id !== id));
    }
    function updateInventory(name, value) {
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
    function getRecipeDisplayName(name, recipes) {
        return recipes[name]?.display_name ?? name;
    }
    const selectStyles = {
        control: (base) => ({
            ...base,
            backgroundColor: "#1e1e1e",
            color: "#eee",
            borderColor: "#555",
        }),
        menu: (base) => ({
            ...base,
            backgroundColor: "#1e1e1e",
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? "#333" : "#1e1e1e",
            color: "#eee",
        }),
        singleValue: (base) => ({
            ...base,
            color: "#eee",
        }),
        input: (base) => ({
            ...base,
            color: "#eee",
        }),
        placeholder: (base) => ({
            ...base,
            color: "#aaa",
        }),
    };
    const totalProjectedCost = [...rawRows, ...craftableRows].reduce((sum, row) => sum + row.missing * (costs[row.name] ?? 0), 0);
    return (_jsxs("div", { style: { padding: 20 }, children: [_jsxs("div", { style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                }, children: [_jsx("h1", { children: "Recipe Crafter" }), _jsxs("div", { children: [_jsx("button", { type: "button", onClick: () => setDarkMode((prev) => !prev), children: darkMode ? "Light Mode" : "Dark Mode" }), _jsx("button", { type: "button", onClick: resetProgress, style: { marginLeft: 8 }, children: "Reset Progress" })] })] }), _jsx("h2", { children: "Recipes to Make" }), selectedRecipes.map((selected) => {
                const selectedRecipe = recipes[selected.item];
                const recipeOptions = itemNames.map((name) => ({
                    value: name, // internal key
                    label: getRecipeDisplayName(name, recipes), // user-facing name
                }));
                return (_jsxs("div", { className: "selected-recipe-row", children: [_jsx("div", { className: "recipe-select-wrapper", children: _jsx(Select, { options: recipeOptions, value: recipeOptions.find((option) => option.value === selected.item), onChange: (option) => {
                                    if (option) {
                                        updateSelectedRecipe(selected.id, {
                                            item: option.value,
                                        });
                                    }
                                }, isSearchable: true, placeholder: "Search recipe...", styles: selectStyles }) }), _jsx("input", { type: "number", min: 1, value: selected.qty, onChange: (e) => updateSelectedRecipe(selected.id, {
                                qty: Math.max(1, Number(e.target.value) || 1),
                            }) }), _jsx("button", { onClick: () => removeSelectedRecipe(selected.id), children: "Remove" })] }, selected.id));
            }), _jsxs("div", { className: "recipe-total-cost", children: ["Total Cost: ", totalProjectedCost.toLocaleString()] }), _jsx("button", { type: "button", onClick: addSelectedRecipe, children: "Add Recipe" }), _jsxs("div", { className: "materials-wrapper", children: [_jsxs("div", { className: "materials-section", children: [_jsx("h2", { children: "Craftable Materials" }), _jsxs("table", { className: "materials-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Item" }), _jsx("th", { children: "Needed" }), _jsx("th", { children: "Owned" }), _jsx("th", { children: "Left to get" }), _jsx("th", { children: "Can Craft" }), _jsx("th", { children: "Output" }), _jsx("th", { children: "Crafts" }), _jsx("th", { children: "Cost Each" }), _jsx("th", { children: "Total Cost" })] }) }), _jsx("tbody", { children: craftableRows.map((row) => (_jsxs("tr", { children: [_jsx("td", { children: row.name }), _jsx("td", { children: row.needed }), _jsx("td", { children: _jsx("input", { type: "number", min: 0, value: inventory[row.name] || "", onChange: (e) => updateInventory(row.name, Number(e.target.value) || 0) }) }), _jsx("td", { children: row.missing }), _jsx("td", { children: row.craftableFromOwnedRaw || 0 }), _jsx("td", { children: row.outputqty }), _jsx("td", { children: row.crafts }), _jsx("td", { children: _jsx("input", { type: "number", min: 0, value: costs[row.name] ?? "", onChange: (e) => updateCost(row.name, e.target.value) }) }), _jsx("td", { children: (row.needed * (costs[row.name] ?? 0)).toLocaleString() })] }, row.name))) })] })] }), _jsxs("div", { className: "materials-section", children: [_jsx("h2", { children: "Raw Materials" }), _jsxs("table", { className: "materials-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Item" }), _jsx("th", { children: "Needed" }), _jsx("th", { children: "Owned" }), _jsx("th", { children: "Left to get" }), _jsx("th", { children: "Cost Each" }), _jsx("th", { children: "Total Cost" })] }) }), _jsx("tbody", { children: rawRows.map((row) => (_jsxs("tr", { children: [_jsx("td", { children: row.name }), _jsx("td", { children: row.needed }), _jsx("td", { children: _jsx("input", { type: "number", min: 0, value: inventory[row.name] || "", onChange: (e) => updateInventory(row.name, Number(e.target.value) || 0) }) }), _jsx("td", { children: row.missing }), _jsx("td", { children: _jsx("input", { type: "number", min: 0, value: costs[row.name] ?? "", onChange: (e) => updateCost(row.name, e.target.value) }) }), _jsx("td", { children: (row.needed * (costs[row.name] ?? 0)).toLocaleString() })] }, row.name))) })] })] })] }), _jsx("h2", { children: "Recipe Trees" }), _jsx("div", { className: "recipe-tree-grid", children: selectedRecipes.map((selected) => (_jsxs("div", { className: "recipe-tree-panel", children: [_jsxs("h3", { children: [selected.item, " x", selected.qty] }), _jsx(RecipeGraph, { item: selected.item, recipes: recipes, quantity: selected.qty, inventory: inventory })] }, selected.id))) })] }));
}
