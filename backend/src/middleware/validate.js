import { badRequest } from "../lib/httpError.js";

const validate = (schemas) => (req, res, next) => {
    req.data = {};
    for (const part of ["params", "query", "body"]) {
        if (!schemas[part]) continue;
        const result = schemas[part].safeParse(req[part] ?? {});
        if (!result.success) {
            throw badRequest(
                "Validation failed",
                result.error.issues.map((issue) => ({
                    location: part,
                    path: issue.path.join("."),
                    message: issue.message
                }))
            );
        }
        req.data[part] = result.data;
    }
    next();
};

export default validate;
