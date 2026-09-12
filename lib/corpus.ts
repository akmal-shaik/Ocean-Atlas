import { z } from "zod";
export const speciesIds = [
  "salmon",
  "tuna",
  "whale-shark",
  "squid",
  "green-turtle",
  "moon-jelly",
] as const;
export const speciesIdSchema = z.enum(speciesIds);
export type SpeciesId = z.infer<typeof speciesIdSchema>;
const sourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  url: z.url(),
  accessed: z.iso.date(),
});
const evidenceSchema = z.object({
  id: z.string(),
  speciesId: speciesIdSchema,
  topic: z.enum(["overview", "size", "habitat", "diet", "fact"]),
  text: z.string().min(1).max(700),
  sourceIds: z.array(z.string()).min(1),
});
const sizeSchema = z.object({
  metres: z.number().positive(),
  basis: z.enum(["reported maximum", "reported adult upper bound"]),
  definition: z.string(),
  evidenceId: z.string(),
});
const speciesSchema = z.object({
  id: speciesIdSchema,
  name: z.string(),
  scientificName: z.string(),
  colour: z.string(),
  size: sizeSchema,
  depthMetres: z.tuple([z.number(), z.number()]).nullable(),
  depthNote: z.string(),
});
export const corpusSchema = z
  .object({
    version: z.string(),
    sources: z.array(sourceSchema),
    species: z.array(speciesSchema),
    evidence: z.array(evidenceSchema),
  })
  .superRefine((c, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    for (const key of ["sources", "species", "evidence"] as const)
      if (new Set(c[key].map((x) => x.id)).size !== c[key].length)
        fail(`Duplicate ${key} IDs`);
    if (c.species.length !== speciesIds.length)
      fail(`Expected ${speciesIds.length} species`);
    for (const e of c.evidence) {
      if (!c.species.some((s) => s.id === e.speciesId))
        fail("Unknown evidence species");
      for (const id of e.sourceIds)
        if (!c.sources.some((s) => s.id === id)) fail(`Unknown source ${id}`);
    }
    for (const s of c.species) {
      if (
        !c.evidence.some(
          (e) =>
            e.id === s.size.evidenceId &&
            e.speciesId === s.id &&
            e.topic === "size",
        )
      )
        fail("Invalid size evidence");
      for (const t of ["overview", "size", "habitat", "diet", "fact"])
        if (!c.evidence.some((e) => e.speciesId === s.id && e.topic === t))
          fail(`Missing ${t}`);
    }
  });
const source = (id: string, title: string, publisher: string, url: string) => ({
  id,
  title,
  publisher,
  url,
  accessed: "2026-09-12",
});
const e = (
  speciesId: SpeciesId,
  topic: "overview" | "size" | "habitat" | "diet" | "fact",
  suffix: string,
  text: string,
  ...sourceIds: string[]
) => ({ id: `${speciesId}.${suffix}`, speciesId, topic, text, sourceIds });
export const corpus = corpusSchema.parse({
  version: "2026-09-12.2",
  sources: [
    source(
      "noaa-salmon",
      "Atlantic Salmon",
      "NOAA Fisheries",
      "https://www.fisheries.noaa.gov/species/atlantic-salmon",
    ),
    source(
      "noaa-salmon-facts",
      "Fun Facts About Amazing Atlantic Salmon",
      "NOAA Fisheries",
      "https://www.fisheries.noaa.gov/national/outreach-and-education/fun-facts-about-amazing-atlantic-salmon",
    ),
    source(
      "noaa-tuna",
      "Western Atlantic Bluefin Tuna",
      "NOAA Fisheries",
      "https://www.fisheries.noaa.gov/species/western-atlantic-bluefin-tuna",
    ),
    source(
      "florida-shark",
      "Whale Shark",
      "Florida Museum",
      "https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/whale-shark/",
    ),
    source(
      "georgia-shark",
      "Whale Shark",
      "Georgia Aquarium",
      "https://www.georgiaaquarium.org/animal/whale-shark/",
    ),
    source(
      "smithsonian-squid",
      "How Big is the Giant Squid?",
      "Smithsonian Ocean",
      "https://ocean.si.edu/ocean-life/invertebrates/giant-squid",
    ),
    source(
      "nhm-squid",
      "Giant squid: from the deep sea to display",
      "Natural History Museum, London",
      "https://www.nhm.ac.uk/discover/giant-squid.html",
    ),
    source(
      "noaa-green-turtle",
      "Green Turtle",
      "NOAA Fisheries",
      "https://www.fisheries.noaa.gov/species/green-turtle",
    ),
    source(
      "aop-moon-jelly",
      "Moon Jelly",
      "Aquarium of the Pacific",
      "https://www.aquariumofpacific.org/onlinelearningcenter/species/moon_jelly",
    ),
  ],
  species: [
    {
      id: "salmon",
      name: "Atlantic salmon",
      scientificName: "Salmo salar",
      colour: "#a7d2cc",
      size: {
        metres: 1.524,
        basis: "reported maximum",
        definition:
          "Fish length: NOAA reports 60 inches; exact tail-measurement convention is unspecified. Converted at 0.0254 m/in.",
        evidenceId: "salmon.size",
      },
      depthMetres: null,
      depthNote: "Numeric depth range unknown in this corpus.",
    },
    {
      id: "tuna",
      name: "Atlantic bluefin tuna",
      scientificName: "Thunnus thynnus",
      colour: "#729dd7",
      size: {
        metres: 3.9624,
        basis: "reported maximum",
        definition:
          "Fish length: NOAA reports up to 13 feet; exact tail-measurement convention is unspecified. Converted at 0.3048 m/ft.",
        evidenceId: "tuna.size",
      },
      depthMetres: [500, 1000],
      depthNote: "Frequent dive depths, not its full habitat range.",
    },
    {
      id: "whale-shark",
      name: "Whale shark",
      scientificName: "Rhincodon typus",
      colour: "#78bfc3",
      size: {
        metres: 18.8,
        basis: "reported maximum",
        definition:
          "Whole fish length, largest measured individual reported by Georgia Aquarium; tail convention unspecified.",
        evidenceId: "whale-shark.size",
      },
      depthMetres: [0, 1928],
      depthNote:
        "Often near the surface; recorded dives reach 1,928 m. This is not a typical depth interval.",
    },
    {
      id: "squid",
      name: "Giant squid",
      scientificName: "Architeuthis dux",
      colour: "#db927b",
      size: {
        metres: 13,
        basis: "reported maximum",
        definition:
          "Total length, including the two long feeding tentacles. Not mantle length (record 2.25 m).",
        evidenceId: "squid.size",
      },
      depthMetres: [500, 1000],
      depthNote:
        "Habitat depths described by Smithsonian; not an absolute limit.",
    },
    {
      id: "green-turtle",
      name: "Green turtle",
      scientificName: "Chelonia mydas",
      colour: "#80b596",
      size: {
        metres: 1.2192,
        basis: "reported adult upper bound",
        definition:
          "Upper end of NOAA's reported 3–4 ft adult length range, converted at 0.3048 m/ft; not a species record.",
        evidenceId: "green-turtle.size",
      },
      depthMetres: null,
      depthNote: "A numeric depth range is not available in this corpus.",
    },
    {
      id: "moon-jelly",
      name: "Moon jelly",
      scientificName: "Aurelia aurita",
      colour: "#b7d7dc",
      size: {
        metres: 0.4,
        basis: "reported maximum",
        definition:
          "Bell diameter: Aquarium of the Pacific reports a 5–40 cm range; 0.40 m is the reported upper bound.",
        evidenceId: "moon-jelly.size",
      },
      depthMetres: null,
      depthNote: "A numeric depth range is not available in this corpus.",
    },
  ],
  evidence: [
    e(
      "salmon",
      "overview",
      "overview",
      "Atlantic salmon (Salmo salar) hatch in fresh water, mature at sea and return to rivers to spawn.",
      "noaa-salmon",
    ),
    e(
      "salmon",
      "size",
      "size",
      "NOAA reports a largest Atlantic salmon length of 60 inches (1.524 m). This is a reported maximum, not a typical adult. The tail-measurement convention is unspecified.",
      "noaa-salmon-facts",
    ),
    e(
      "salmon",
      "size",
      "adult",
      "After two years at sea, adults average 28–30 inches (0.7112–0.762 m); size varies with time at sea.",
      "noaa-salmon",
    ),
    e(
      "salmon",
      "habitat",
      "habitat",
      "Atlantic salmon use freshwater rivers and the North Atlantic Ocean. A numeric depth range is not available in this corpus.",
      "noaa-salmon",
    ),
    e(
      "salmon",
      "diet",
      "diet",
      "Young salmon eat insects in fresh water. At sea, salmon eat fish, crustaceans, cephalopods and polychaete worms.",
      "noaa-salmon-facts",
    ),
    e(
      "salmon",
      "fact",
      "return",
      "Atlantic salmon can survive spawning and return to spawn again.",
      "noaa-salmon",
    ),
    e(
      "salmon",
      "fact",
      "smolt",
      "Smoltification prepares young salmon for salt water; they imprint on river chemistry to help navigate home.",
      "noaa-salmon",
    ),
    e(
      "tuna",
      "overview",
      "overview",
      "Atlantic bluefin tuna (Thunnus thynnus) are large, migratory fish with streamlined, torpedo-shaped bodies. The NOAA profile covers the western Atlantic population.",
      "noaa-tuna",
    ),
    e(
      "tuna",
      "size",
      "size",
      "NOAA reports Atlantic bluefin tuna can reach 13 feet (3.9624 m). This is a reported maximum, not a typical adult; the tail-measurement convention is unspecified.",
      "noaa-tuna",
    ),
    e(
      "tuna",
      "habitat",
      "habitat",
      "Western Atlantic bluefin occur from Newfoundland to the Gulf of America (Gulf of Mexico). They live near the surface in temperate waters and frequently dive to 500–1,000 m.",
      "noaa-tuna",
    ),
    e(
      "tuna",
      "diet",
      "diet",
      "Adults mainly eat baitfish, including herring, bluefish and mackerel. Juveniles eat fish, squid and crustaceans.",
      "noaa-tuna",
    ),
    e(
      "tuna",
      "fact",
      "migration",
      "Atlantic bluefin can migrate thousands of miles and cross the Atlantic east–west boundary.",
      "noaa-tuna",
    ),
    e(
      "tuna",
      "fact",
      "colour",
      "Atlantic bluefin have dark blue-black backs and pale bellies, with short pectoral fins.",
      "noaa-tuna",
    ),
    e(
      "whale-shark",
      "overview",
      "overview",
      "The whale shark (Rhincodon typus) is the largest living fish and a filter-feeding shark.",
      "florida-shark",
    ),
    e(
      "whale-shark",
      "size",
      "size",
      "Georgia Aquarium reports the largest measured whale shark at 18.8 m (61.7 feet). This is a recorded maximum, not a typical adult size.",
      "georgia-shark",
    ),
    e(
      "whale-shark",
      "habitat",
      "habitat",
      "Whale sharks inhabit tropical and warm temperate seas, excluding the Mediterranean. They often swim near the surface but have reached 1,928 m depth.",
      "florida-shark",
    ),
    e(
      "whale-shark",
      "diet",
      "diet",
      "Whale sharks filter plankton, fish eggs and other small organisms from water; their diet also includes crustaceans and schooling fish.",
      "florida-shark",
    ),
    e(
      "whale-shark",
      "fact",
      "pattern",
      "Light spots and stripes on a dark background form a distinctive pattern. The head is broad and flat.",
      "florida-shark",
    ),
    e(
      "whale-shark",
      "fact",
      "movement",
      "Whale sharks are highly migratory but can return to the same feeding sites.",
      "florida-shark",
    ),
    e(
      "squid",
      "overview",
      "overview",
      "Giant squid are deep-ocean cephalopods. DNA research supports a single species, Architeuthis dux.",
      "nhm-squid",
    ),
    e(
      "squid",
      "size",
      "size",
      "Smithsonian reports a recorded maximum total length of 13 m, including tentacles, and a longest recorded mantle of 2.25 m. Total length and mantle length are different measurements.",
      "smithsonian-squid",
    ),
    e(
      "squid",
      "habitat",
      "habitat",
      "Smithsonian describes giant squid habitat at 500–1,000 m depth and suggests a preference for continental and island slopes. These are not absolute depth limits.",
      "smithsonian-squid",
    ),
    e(
      "squid",
      "diet",
      "diet",
      "Stomach contents indicate giant squid eat deep-water fish and other squid, including giant squid.",
      "smithsonian-squid",
    ),
    e(
      "squid",
      "fact",
      "arms",
      "Giant squid have eight arms and two long feeding tentacles that bring prey towards the beak.",
      "smithsonian-squid",
    ),
    e(
      "squid",
      "fact",
      "predator",
      "Giant squid remains found in sperm whale stomachs establish that sperm whales eat them.",
      "smithsonian-squid",
    ),
    e(
      "green-turtle",
      "overview",
      "overview",
      "The green turtle (Chelonia mydas) is the largest hard-shelled sea turtle and must surface to breathe.",
      "noaa-green-turtle",
    ),
    e(
      "green-turtle",
      "size",
      "size",
      "NOAA reports adults at 3–4 ft (0.9144–1.2192 m) long. The upper value is an adult-range bound, not a species record.",
      "noaa-green-turtle",
    ),
    e(
      "green-turtle",
      "habitat",
      "habitat",
      "Green turtles occur worldwide, mainly in subtropical and temperate parts of the Atlantic, Pacific and Indian Oceans and the Mediterranean. Juveniles move from open ocean habitat to shallow coastal foraging grounds.",
      "noaa-green-turtle",
    ),
    e(
      "green-turtle",
      "diet",
      "diet",
      "Green turtles mainly eat algae and seagrasses, though some also eat invertebrates and other animal matter.",
      "noaa-green-turtle",
    ),
    e(
      "green-turtle",
      "fact",
      "migration",
      "Adults migrate hundreds to thousands of miles between foraging grounds and nesting beaches; females usually return to the general area where they hatched.",
      "noaa-green-turtle",
    ),
    e(
      "moon-jelly",
      "overview",
      "overview",
      "The moon jelly (Aurelia aurita) is a translucent true jellyfish made up of approximately 95% water.",
      "aop-moon-jelly",
    ),
    e(
      "moon-jelly",
      "size",
      "size",
      "Aquarium of the Pacific reports moon jellies at 5–40 cm in bell diameter; 0.40 m is the reported upper bound.",
      "aop-moon-jelly",
    ),
    e(
      "moon-jelly",
      "habitat",
      "habitat",
      "Moon jellies occur throughout the world ocean, favour tropical and temperate waters, and are primarily found in pelagic open-ocean environments.",
      "aop-moon-jelly",
    ),
    e(
      "moon-jelly",
      "diet",
      "diet",
      "Moon jellies are carnivorous and mainly eat small plankton.",
      "aop-moon-jelly",
    ),
    e(
      "moon-jelly",
      "fact",
      "appearance",
      "Moon jellies are translucent and can appear coloured by food they have eaten; four horseshoe-shaped structures are visible through the bell.",
      "aop-moon-jelly",
    ),
  ],
});
export const species = corpus.species;
export const evidenceFor = (id: SpeciesId) =>
  corpus.evidence.filter((e) => e.speciesId === id);
export const sourcesFor = (ids: string[]) =>
  corpus.sources.filter((s) => ids.includes(s.id));
export type Evidence = z.infer<typeof evidenceSchema>;
