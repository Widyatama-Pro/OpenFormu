export type CommodityGroup = "broiler" | "layer" | "cattle_beef" | "cattle_dairy" | "other";

const POULTRY_SPECIES = new Set([
  "broiler",
  "layer",
  "buras",
  "duck",
  "quail",
  "turkey",
  "goose",
  "poultry",
]);
const RUMINANT_SPECIES = new Set([
  "cattle_beef",
  "cattle_dairy",
  "buffalo",
  "sheep",
  "goat",
  "goat_sheep",
  "ruminant",
]);

/** Mengembalikan true jika spesies ternak termasuk kelompok unggas (fokus EM, bukan TDN). */
export function isPoultrySpecies(species: string | undefined): boolean {
  return species !== undefined && POULTRY_SPECIES.has(species);
}

/** Mengembalikan true jika spesies ternak termasuk kelompok ruminansia (fokus TDN, bukan EM unggas). */
export function isRuminantSpecies(species: string | undefined): boolean {
  return species !== undefined && RUMINANT_SPECIES.has(species);
}

/** Memetakan kode spesies menjadi 4 komoditas utama + kelompok Lainnya untuk selector UI. */
export function getCommodityGroup(species: string | undefined): CommodityGroup {
  switch (species) {
    case "broiler":
      return "broiler";
    case "layer":
      return "layer";
    case "cattle_beef":
      return "cattle_beef";
    case "cattle_dairy":
      return "cattle_dairy";
    default:
      return "other";
  }
}
