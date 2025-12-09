import fs from "fs";
import path from "path";
import { glob } from "glob";

// 修复所有 bundle 中的 HTML 文件路径分隔符
const bundlesDir = path.join(process.cwd(), "bundles");

console.log(`Searching for HTML files in: ${bundlesDir}`);

const htmlFiles = glob.sync("**/dashboard/*.html", {
  cwd: bundlesDir,
  absolute: true,
  ignore: ["**/node_modules/**"],
});

console.log(`Found ${htmlFiles.length} HTML files`);

let fixedCount = 0;

htmlFiles.forEach((htmlFile) => {
  let content = fs.readFileSync(htmlFile, "utf8");
  // 将所有 src 和 href 中的反斜杠替换为正斜杠
  const fixedContent = content.replace(/(\s(?:src|href)="[^"]*?)\\+/g, "$1/");

  if (content !== fixedContent) {
    fs.writeFileSync(htmlFile, fixedContent, "utf8");
    console.log(`Fixed paths in: ${path.relative(process.cwd(), htmlFile)}`);
    fixedCount++;
  }
});

console.log(`Path separator fix completed! Fixed ${fixedCount} files.`);
