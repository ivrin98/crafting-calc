
export type Recipe={id:number;recipe_level:number;success_rate:number;outputqty:number;materials:Record<string,number>};
export type RecipeMap=Record<string,Recipe>;
