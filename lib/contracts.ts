import { z } from "zod";
import { speciesIdSchema } from "./corpus";
export const requestSchema = z
  .object({
    speciesIds: z
      .array(speciesIdSchema)
      .min(1)
      .max(2)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Choose distinct species",
      ),
    question: z.string().trim().min(1).max(800),
  })
  .strict();
export const answerSchema = z
  .object({
    answer: z.string().min(1).max(5000),
    evidenceIds: z.array(z.string()).max(20),
    insufficientEvidence: z.boolean(),
  })
  .strict();
export type Answer = z.infer<typeof answerSchema>;
export type Question = z.infer<typeof requestSchema>;
export type AnswerResponse = Answer & {
  citations: {
    evidenceId: string;
    text: string;
    sources: {
      id: string;
      title: string;
      publisher: string;
      url: string;
      accessed: string;
    }[];
  }[];
};
