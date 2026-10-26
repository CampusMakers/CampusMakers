import { z } from "zod";
import config from "../config.js";

export const id = z.coerce.number().int().positive();

export const idParam = z.object({ id });

export const pagination = {
    limit: z.coerce.number().int().min(1).max(config.pagination.maxSize).default(config.pagination.defaultSize),
    offset: z.coerce.number().int().min(0).default(0)
};

export const paymentMethods = ["cash", "card", "venmo", "zelle", "paypal", "other"];

export const paymentMethod = z.enum(paymentMethods);

export const username = z
    .string()
    .trim()
    .regex(/^@?[a-zA-Z0-9_.]{3,30}$/, "Usernames are 3 to 30 letters, numbers, dots or underscores")
    .transform((value) => value.replace(/^@/, "").toLowerCase());

export const money = z.coerce.number().min(0).multipleOf(0.01);

export const timestamp = z.iso.datetime({ offset: true });
