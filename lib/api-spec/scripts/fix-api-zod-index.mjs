import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, "..", "..", "api-zod", "src", "index.ts");
fs.writeFileSync(indexPath, 'export * from "./generated/api";\n', "utf8");
