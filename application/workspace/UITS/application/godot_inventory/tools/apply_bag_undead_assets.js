const fs = require("fs/promises");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(projectRoot, "exports", "bag_undead_pack", "assets");
const targetRoot = path.join(projectRoot, "assets");

async function copyDirectory(sourceDir, targetDir) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  await fs.mkdir(targetDir, { recursive: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
      continue;
    }

    await fs.copyFile(sourcePath, targetPath);
  }
}

async function main() {
  await fs.access(sourceRoot);
  await copyDirectory(path.join(sourceRoot, "ui"), path.join(targetRoot, "ui"));
  await copyDirectory(path.join(sourceRoot, "icons"), path.join(targetRoot, "icons"));
  console.log(`Applied bag export assets from ${sourceRoot} to ${targetRoot}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
