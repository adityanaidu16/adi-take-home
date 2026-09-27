import { z } from "zod";

export const conditionSchema = z.union([
  z.object({ field: z.string(), equals: z.union([z.string(), z.number(), z.boolean()]) }).strict(),
  z.object({ field: z.string(), gt: z.number() }).strict(),
]);

export const appConfigSchema = z
  .object({
    name: z.string().min(1),
    owner: z.string().min(1),
    datasource: z.string().min(1),
    roles: z.record(z.string(), z.array(z.string()).min(1)),
    view: z
      .object({
        columns: z.array(z.string()).min(1),
        visible_to: z.array(z.string()).min(1),
        show_sensitive_to: z.array(z.string()).default([]),
      })
      .strict(),
    actions: z
      .array(
        z
          .object({
            use: z.string(),
            allowed_roles: z.array(z.string()).min(1),
            approval: z
              .object({
                when: conditionSchema.optional(),
                approver_roles: z.array(z.string()).min(1),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();

export type AppConfig = z.infer<typeof appConfigSchema>;
export type AppConfigAction = AppConfig["actions"][number];
