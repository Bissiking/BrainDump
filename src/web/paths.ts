import { fileURLToPath } from "node:url";

// Same depth in src/web and dist/web; independent of the process working directory.
export const publicRoot = fileURLToPath(new URL("../../public/", import.meta.url));
export const viewsRoot = fileURLToPath(new URL("../../views/", import.meta.url));
