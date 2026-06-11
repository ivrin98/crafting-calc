import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import RecipeGraph from "./components/RecipeGraph";
import { resolveRecipe, finalizeResolvedResult, } from "./utils/resolver";
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
    const itemNames = useMemo(() => Object.keys(recipes).sort(), [recipes]);
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
    const craftableRows = Object.values(resolved.craftable).sort((a, b) => a.name.localeCompare(b.name));
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
    return (_jsxs("div", { style: { padding: 20 }, children: [_jsxs("div", { style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                }, children: [_jsx("h1", { children: "Recipe Crafter" }), _jsxs("div", { children: [_jsx("button", { type: "button", onClick: () => setDarkMode((prev) => !prev), children: darkMode ? "Light Mode" : "Dark Mode" }), _jsx("button", { type: "button", onClick: resetProgress, style: { marginLeft: 8 }, children: "Reset Progress" })] })] }), _jsx("h2", { children: "Recipes to Make" }), selectedRecipes.map((selected) => {
                const selectedRecipe = recipes[selected.item];
                return (_jsxs("div", { className: "selected-recipe-row", children: [_jsx("select", { value: selected.item, onChange: (e) => updateSelectedRecipe(selected.id, { item: e.target.value }), children: itemNames.map((name) => (_jsx("option", { value: name, children: name }, name))) }), _jsx("input", { type: "number", min: 1, value: selected.qty, onChange: (e) => updateSelectedRecipe(selected.id, {
                                qty: Math.max(1, Number(e.target.value) || 1),
                            }) }), selectedRecipe && (_jsxs("span", { children: ["Success: ", selectedRecipe.success_rate, "% | Output:", " ", selectedRecipe.outputqty] })), _jsx("button", { type: "button", onClick: () => removeSelectedRecipe(selected.id), disabled: selectedRecipes.length === 1, children: "Remove" })] }, selected.id));
            }), _jsx("button", { type: "button", onClick: addSelectedRecipe, children: "Add Recipe" }), _jsxs("div", { className: "materials-wrapper", children: [_jsxs("div", { className: "materials-section", children: [_jsx("h2", { children: "Craftable Materials" }), _jsxs("table", { className: "materials-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Item" }), _jsx("th", { children: "Needed" }), _jsx("th", { children: "I Have" }), _jsx("th", { children: "Still Need Item" }), _jsx("th", { children: "Can Craft" }), _jsx("th", { children: "Output" }), _jsx("th", { children: "Crafts" })] }) }), _jsx("tbody", { children: craftableRows.map((row) => (_jsxs("tr", { children: [_jsx("td", { children: row.name }), _jsx("td", { children: row.needed }), _jsx("td", { children: _jsx("input", { type: "number", min: 0, value: inventory[row.name] || "", onChange: (e) => updateInventory(row.name, Number(e.target.value) || 0) }) }), _jsx("td", { children: row.missing }), _jsx("td", { children: row.craftableFromOwnedRaw || 0 }), _jsx("td", { children: row.outputqty }), _jsx("td", { children: row.crafts })] }, row.name))) })] })] }), _jsxs("div", { className: "materials-section", children: [_jsx("h2", { children: "Raw Materials" }), _jsxs("table", { className: "materials-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Item" }), _jsx("th", { children: "Needed" }), _jsx("th", { children: "I Have" }), _jsx("th", { children: "Still Need" })] }) }), _jsx("tbody", { children: rawRows.map((row) => (_jsxs("tr", { children: [_jsx("td", { children: row.name }), _jsx("td", { children: row.needed }), _jsx("td", { children: _jsx("input", { type: "number", min: 0, value: inventory[row.name] || "", onChange: (e) => updateInventory(row.name, Number(e.target.value) || 0) }) }), _jsx("td", { children: row.missing })] }, row.name))) })] })] })] }), _jsx("h2", { children: "Recipe Trees" }), _jsx("div", { className: "recipe-tree-grid", children: selectedRecipes.map((selected) => (_jsxs("div", { className: "recipe-tree-panel", children: [_jsxs("h3", { children: [selected.item, " x", selected.qty] }), _jsx(RecipeGraph, { item: selected.item, recipes: recipes, quantity: selected.qty, inventory: inventory })] }, selected.id))) })] }));
}
