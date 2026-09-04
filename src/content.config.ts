import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const verificationStatus = z.enum([
  "verified",
  "user-confirmed",
  "provisional",
  "conflicted",
  "legacy-only",
]);

const verificationSchema = z
  .object({
    status: verificationStatus,
    provenance: z.enum(["user-confirmed", "user-supplied", "external-source", "legacy-site"]),
    sourceId: z.string().min(1),
    note: z.string().min(1).optional(),
    checkedAt: z.coerce.date().optional(),
    publishable: z.boolean(),
  })
  .superRefine((verification, ctx) => {
    const publishableStatuses = new Set(["verified", "user-confirmed"]);

    if (verification.publishable && !publishableStatuses.has(verification.status)) {
      ctx.addIssue({
        code: "custom",
        message: "Only verified or user-confirmed content may be marked publishable.",
        path: ["publishable"],
      });
    }
  });

const partialDateSchema = z
  .string()
  .regex(/^\d{4}(?:-(?:0[1-9]|1[0-2]))?(?:-(?:0[1-9]|[12]\d|3[01]))?$/, {
    message: "Use YYYY, YYYY-MM, or YYYY-MM-DD.",
  });

const profile = defineCollection({
  loader: glob({
    base: "./src/content/profile",
    pattern: "**/*.yaml",
  }),
  schema: z.object({
    name: z.string().min(1),
    language: z.literal("en"),
    email: z.email().optional(),
    githubHandle: z.string().min(1).optional(),
    positioning: z
      .object({
        eyebrow: z.string().min(1),
        // One entry per rendered line of the hero claim. The break is authored,
        // not left to the browser, so each sentence stays whole on its own line.
        statement: z.array(z.string().min(1)).min(1),
        metaDescription: z.string().min(1),
        verification: verificationSchema,
      })
      .optional(),
    proofPoints: z
      .array(
        z.object({
          label: z.string().min(1),
          detail: z.string().min(1),
        }),
      )
      .optional(),
    identities: z
      .object({
        scholar: z.url().optional(),
        orcid: z.url().optional(),
        github: z.url().optional(),
        linkedin: z.url().optional(),
      })
      .optional(),
    scholarMetrics: z
      .object({
        citationsLabel: z.string().min(1),
        hIndex: z.number().int().positive(),
        i10Index: z.number().int().positive().optional(),
        verification: verificationSchema,
      })
      .optional(),
    biography: z.object({
      sourceText: z.string().min(1),
      paragraphs: z.array(z.string().min(1)).optional(),
      verification: verificationSchema,
    }),
    currentRole: z.object({
      title: z.string().min(1),
      institution: z.string().min(1),
      department: z.string().min(1).optional(),
      advisor: z.string().min(1).optional(),
      startDate: partialDateSchema.optional(),
      verification: verificationSchema,
    }),
    previousRoleSummary: z
      .object({
        title: z.string().min(1),
        institution: z.string().min(1),
        verification: verificationSchema,
      })
      .optional(),
    researchThemeIds: z.array(z.string().min(1)),
    identityVerification: verificationSchema,
  }),
});

const researchThemes = defineCollection({
  loader: glob({
    base: "./src/content/research-themes",
    pattern: "**/*.yaml",
  }),
  schema: z.object({
    title: z.string().min(1),
    order: z.number().int().positive(),
    thesis: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    body: z.array(z.string().min(1)).optional(),
    tags: z.array(z.string().min(1)).optional(),
    status: z.string().min(1).optional(),
    verification: verificationSchema,
  }),
});

const authorSchema = z.object({
  displayName: z.string().min(1),
  isSiteOwner: z.boolean(),
});

const publications = defineCollection({
  loader: glob({
    base: "./src/content/publications",
    pattern: "**/*.yaml",
  }),
  schema: z
    .object({
      title: z.string().min(1),
      authors: z.array(authorSchema).min(1),
      year: z.number().int().min(1900).max(2100),
      publishedAt: partialDateSchema.optional(),
      type: z.enum(["conference-paper", "journal-article"]),
      status: z.literal("published"),
      // Resolved from Crossref and verified against title and year. The entry
      // renders a DOI link only when this is present.
      doi: z
        .string()
        .regex(/^10\.\d{4,9}\/\S+$/)
        .optional(),
      venue: z.object({
        name: z.string().min(1),
        shortName: z.string().min(1).optional(),
      }),
      volume: z.string().min(1).optional(),
      issue: z.string().min(1).optional(),
      pages: z.string().min(1).optional(),
      articleNumber: z.string().min(1).optional(),
      verification: verificationSchema,
    })
    .superRefine((publication, ctx) => {
      const ownerCount = publication.authors.filter((author) => author.isSiteOwner).length;

      if (ownerCount !== 1) {
        ctx.addIssue({
          code: "custom",
          message: "Each publication must identify exactly one site owner.",
          path: ["authors"],
        });
      }
    }),
});

const experience = defineCollection({
  loader: glob({
    base: "./src/content/experience",
    pattern: "**/*.yaml",
  }),
  schema: z
    .object({
      role: z.string().min(1),
      institution: z.string().min(1),
      department: z.string().min(1).optional(),
      advisor: z.string().min(1).optional(),
      startDate: partialDateSchema.optional(),
      endDate: partialDateSchema.optional(),
      ongoing: z.boolean(),
      order: z.number().int().positive(),
      summary: z.string().min(1).optional(),
      // Second line of the Research-page trajectory timeline. Keep it to one
      // sentence; the full detail lives in bullets.
      trajectoryNote: z.string().min(1).optional(),
      bullets: z.array(z.string().min(1)).optional(),
      verification: verificationSchema,
    })
    .superRefine((entry, ctx) => {
      if (entry.ongoing && entry.endDate) {
        ctx.addIssue({
          code: "custom",
          message: "Ongoing experience cannot have an end date.",
          path: ["endDate"],
        });
      }
    }),
});

const education = defineCollection({
  loader: glob({
    base: "./src/content/education",
    pattern: "**/*.yaml",
  }),
  schema: z.object({
    degree: z.string().min(1),
    field: z.string().min(1),
    // Optional second line under the degree (e.g. the school of the Ph.D.).
    program: z.string().min(1).optional(),
    institution: z.string().min(1),
    // Substring of `institution` that must stay on one line (wraps before it).
    keepTogether: z.string().min(1).optional(),
    school: z.string().min(1).optional(),
    // Where `school` sits: under the institution (default) or under the degree.
    schoolWith: z.enum(["degree", "institution"]).optional(),
    advisor: z.string().min(1).optional(),
    graduationYear: z.number().int().min(1900).max(2100),
    startYear: z.number().int().min(1900).max(2100).optional(),
    order: z.number().int().positive(),
    verification: verificationSchema,
  }),
});

const news = defineCollection({
  loader: glob({
    base: "./src/content/news",
    pattern: "**/*.yaml",
  }),
  schema: z.object({
    date: partialDateSchema,
    text: z.string().min(1),
    verification: verificationSchema,
  }),
});

const essays = defineCollection({
  loader: glob({
    base: "./src/content/essays",
    pattern: "**/*.md",
  }),
  schema: z.object({
    title: z.string().min(1),
    // Optional internal alias retained for editorial use. Public entry points
    // show the full title so the subject remains clear out of context.
    shortTitle: z.string().min(1).optional(),
    // Optional prefix of `title`. On the essay page only, insert a line break
    // after this phrase so a long H1 does not wrap inside the named idea.
    titleBreakAfter: z.string().min(1).optional(),
    // The reader-facing standfirst. When present, it is shared by the essay
    // page, the Essays index, and the featured Home card. `description` is
    // metadata copy rather than a second visible summary.
    subtitle: z.string().min(1).optional(),
    // Label above the title on the essay page. Defaults to "Essay" in the
    // layout, so a technical note is never mislabeled as a position paper.
    kind: z.string().min(1).optional(),
    date: z.coerce.date(),
    description: z.string().min(1),
    ogSlug: z.string().min(1).optional(),
    order: z.number().int().positive(),
    draft: z.boolean().default(false),
  }),
});

/**
 * Studio pieces at /studio/ (formerly the unpublished Projects section).
 * Older system-shaped records stay in this folder as drafts until the owner
 * chooses what belongs here. Placeholders may omit stack, status, and repository.
 */
const projects = defineCollection({
  loader: glob({
    base: "./src/content/projects",
    pattern: "**/*.yaml",
  }),
  schema: ({ image }) =>
    z.object({
      name: z.string().min(1),
      tagline: z.string().min(1).optional(),
      description: z.string().min(1),
      kind: z.enum(["photograph", "program"]).default("program"),
      status: z.string().min(1).optional(),
      repository: z.url().optional(),
      // Detail page inside the site, e.g. "/studio/tech-ontology/".
      href: z.string().startsWith("/").optional(),
      // Concept illustration supplied by the owner later. Path relative to the
      // yaml file, e.g. ../../assets/studio/tech-ontology.webp (3:2 landscape,
      // webp, metadata stripped).
      image: image().optional(),
      imageAlt: z.string().min(1).optional(),
      order: z.number().int().positive(),
      draft: z.boolean().default(false),
    }),
});

/**
 * The photo wall at /studio/. One entry per photograph, in the owner's own
 * order. Entries and the WebP copies they point at are generated by
 * `scripts/studio/import-photos.mjs`, which strips EXIF, GPS and ICC from the
 * originals; `alt` is written by hand. `width` and `height` are the pixel
 * dimensions of the optimized copy, so the wall can compute its packing at
 * build time without opening every file.
 */
const photographs = defineCollection({
  loader: glob({
    base: "./src/content/photographs",
    pattern: "**/*.yaml",
  }),
  schema: ({ image }) =>
    z.object({
      image: image(),
      alt: z.string().min(1),
      order: z.number().int().positive(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      title: z.string().min(1).optional(),
      place: z.string().min(1).optional(),
      date: z.string().min(1).optional(),
      draft: z.boolean().default(false),
    }),
});

/**
 * The knowledge map at the foot of the homepage.
 *
 * Two separate things live in this collection and must not merge. The **map** —
 * groups, bands and tile names — is a canonical decomposition of the field:
 * every tile is a name a practitioner in that subfield would recognise,
 * independent of who is reading, so a stranger could grade themselves against
 * it. The **levels** are the site owner's own shading and are the only
 * subjective thing here. A tile that only makes sense because of who drew the
 * map is a wrong tile.
 *
 * Generated by `Workspace/Study/knowledge-map/export_to_site.py`; that folder
 * holds the source data, the grading tool, and the taxonomy provenance.
 */
const knowledgeMap = defineCollection({
  loader: glob({
    base: "./src/content/knowledge-map",
    pattern: "**/*.yaml",
  }),
  schema: z.object({
    title: z.string().min(1),
    lede: z.string().min(1),
    // Rank is the ink ramp, low to high. The renderer sorts by it rather than
    // trusting file order, and cell styling keys off the id.
    levels: z
      .array(
        z.object({
          id: z.string().min(1),
          rank: z.number().int().positive(),
          label: z.string().min(1),
        }),
      )
      .min(2),
    groups: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          bands: z
            .array(
              z.object({
                id: z.string().min(1),
                label: z.string().min(1),
                // Why the tiles are in the order they are — the fab flow, the
                // model lifecycle, the path of a query. Position carries
                // meaning or the row is a list.
                order: z.string().default(""),
                tiles: z
                  .array(
                    z.object({
                      name: z.string().min(1),
                      level: z.string().min(1),
                    }),
                  )
                  .min(1),
              }),
            )
            .min(1),
        }),
      )
      .min(1),
    verification: verificationSchema,
  }),
});

export const collections = {
  profile,
  researchThemes,
  publications,
  experience,
  education,
  news,
  essays,
  projects,
  photographs,
  knowledgeMap,
};
