const fs = require("fs");
const path = require("path");
const { glob } = require("glob");

const htmlFiles = glob.sync("bundles/**/{dashboard,graphics}/*.html");

htmlFiles.forEach((file) => {
  const dir = path.dirname(file);
  const basename = path.basename(file, ".html");
  const jsFile = `${basename}.js`;

  // Check if the JS file exists
  const jsPath = path.join(dir, jsFile);
  if (!fs.existsSync(jsPath)) {
    console.log(`⚠ Skipping ${file} - no ${jsFile} found`);
    return;
  }

  const title = basename
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #2f2f2f;
        color: white;
        font-family: "Roboto", sans-serif;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./${jsFile}"></script>
  </body>
</html>
`;

  fs.writeFileSync(file, htmlContent);
  console.log(`✓ Updated ${file}`);
});

console.log("Done!");
