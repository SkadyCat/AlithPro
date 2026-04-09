const fs = require("fs/promises");
const path = require("path");
const { execFileSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const blueprintPath = path.join(projectRoot, "bag.bp");

function parseBlueprintResources(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- res://assets/"))
    .map((line) => line.slice(2).trim().replace(/^res:\/\//, ""));
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const blueprint = await fs.readFile(blueprintPath, "utf8");
  const resources = parseBlueprintResources(blueprint);

  if (resources.length === 0) {
    throw new Error("bag.bp does not declare any asset resources.");
  }

  console.log(`Generating bag assets from ${path.basename(blueprintPath)}...`);
  execFileSync(process.execPath, [path.join(__dirname, "generate_oriental_inventory_assets.js")], {
    cwd: __dirname,
    stdio: "inherit"
  });
  execFileSync(process.execPath, [path.join(__dirname, "generate_oriental_chrome_assets.js")], {
    cwd: __dirname,
    stdio: "inherit"
  });

  const missing = [];
  for (const resource of resources) {
    const fullPath = path.join(projectRoot, resource.replace(/\//g, path.sep));
    if (!(await fileExists(fullPath))) {
      missing.push(resource);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing generated assets: ${missing.join(", ")}`);
  }

  console.log(`Verified ${resources.length} bag assets.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
