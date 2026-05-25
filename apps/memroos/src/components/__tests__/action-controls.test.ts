import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { describe, expect, it } from "vitest";

const traverse = (traverseModule as any).default ?? traverseModule;

function tsxFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) return entry === "__tests__" ? [] : tsxFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

function attrName(attr: any): string | null {
  return attr?.name?.name ?? null;
}

function attrValue(attr: any): string | boolean | null {
  if (!attr || !("value" in attr)) return true;
  if (!attr.value) return true;
  if (attr.value.type === "StringLiteral") return attr.value.value;
  if (attr.value.type === "JSXExpressionContainer" && attr.value.expression.type === "StringLiteral") {
    return attr.value.expression.value;
  }
  return null;
}

function jsxText(node: any): string {
  if (!node?.children) return "";
  return node.children
    .map((child: any) => {
      if (child.type === "JSXText") return child.value;
      if (child.type === "JSXExpressionContainer" && child.expression.type === "StringLiteral") return child.expression.value;
      if (child.openingElement) return jsxText(child);
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("action controls", () => {
  it("does not render action-looking controls without real behavior", () => {
    const root = process.cwd();
    const files = [
      ...tsxFiles(join(root, "src/app")),
      ...tsxFiles(join(root, "src/components")),
    ];
    const findings: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const ast = parse(source, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
        errorRecovery: true,
      });

      traverse(ast, {
        JSXOpeningElement(path) {
          const nodeName = path.node.name;
          if (nodeName.type !== "JSXIdentifier") return;
          const name = nodeName.name;
          if (name !== "button" && name !== "Link" && name !== "a") return;

          const attributes = path.node.attributes;
          const hasSpread = attributes.some((attr: any) => attr.type === "JSXSpreadAttribute");
          const attrs = new Map(
            attributes
              .filter((attr: any) => attr.type === "JSXAttribute")
              .map((attr: any) => [attrName(attr), attrValue(attr)])
          );
          const line = path.node.loc?.start.line ?? 0;
          const location = `${relative(root, file)}:${line}`;
          const href = attrs.get("href");

          if (href === "#" || (typeof href === "string" && href.toLowerCase().startsWith("javascript:"))) {
            findings.push(`${location} has inert href ${href}`);
          }

          if (
            attrs.has("onClick") &&
            attributes.some((attr: any) => {
              if (attr.type !== "JSXAttribute" || attrName(attr) !== "onClick") return false;
              const expression = attr.value?.type === "JSXExpressionContainer" ? attr.value.expression : null;
              return (
                expression &&
                (expression.type === "ArrowFunctionExpression" || expression.type === "FunctionExpression") &&
                expression.body.type === "BlockStatement" &&
                expression.body.body.length === 0
              );
            })
          ) {
            findings.push(`${location} has an empty onClick handler`);
          }

          const buttonType = attrs.get("type");
          if (
            name === "button" &&
            !hasSpread &&
            !attrs.has("onClick") &&
            buttonType !== "submit" &&
            buttonType !== "reset" &&
            !attrs.has("disabled")
          ) {
            findings.push(`${location} is a native button without onClick, submit/reset type, disabled state, or spread props`);
          }

          const parent = path.parentPath.node;
          if (name === "Link" && href === "/flow" && parent?.type === "JSXElement" && /open page/i.test(jsxText(parent))) {
            findings.push(`${location} links an Open page CTA back to the current Workflow Map`);
          }
        },
      });
    }

    expect(findings).toEqual([]);
  });
});
