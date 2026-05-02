import z from "zod";

export const coverLetterToneSchema = z.enum(["professional", "technical", "concise", "warm"]);

export const coverLetterTargetSchema = z.object({
  jobTitle: z.string().max(160).optional().default(""),
  employerName: z.string().max(160).optional().default(""),
  hiringManager: z.string().max(160).optional().default(""),
  jobDescription: z.string().max(12000).optional().default(""),
});

export const coverLetterSchema = z.object({
  recipient: z
    .string()
    .describe("The recipient/address block as HTML. Use simple <p> and <br /> tags only."),
  content: z
    .string()
    .min(1)
    .describe("The cover letter body as HTML. Use simple <p>, <br />, and strong text only."),
  plainText: z.string().min(1).describe("A plain-text version of the cover letter body."),
  wordCount: z.number().int().min(1),
  tone: coverLetterToneSchema,
});

export type CoverLetterTone = z.infer<typeof coverLetterToneSchema>;
export type CoverLetterTarget = z.infer<typeof coverLetterTargetSchema>;
export type CoverLetter = z.infer<typeof coverLetterSchema>;
