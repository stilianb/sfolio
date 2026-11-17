import { toString } from "mdast-util-to-string";

/**
 * Turn each `##` heading and the blocks that follow it into `<CaseSection>`.
 * An `<ImageSequence>` stays between sections so it spans the full column.
 * @returns {import('unified').Plugin}
 */
export function remarkCaseSections() {
  return (tree) => {
    /** @type {Array<import('unist').Node>} */
    const children = [];
    /** @type {{ title: string, nodes: import('unist').Node[] } | null} */
    let bucket = null;

    const flush = () => {
      if (!bucket) return;
      children.push({
        type: "mdxJsxFlowElement",
        name: "CaseSection",
        attributes: [
          { type: "mdxJsxAttribute", name: "title", value: bucket.title },
        ],
        children: bucket.nodes,
      });
      bucket = null;
    };

    for (const node of tree.children) {
      if (node.type === "mdxjsEsm") {
        children.push(node);
        continue;
      }
      if (node.type === "heading" && node.depth === 2) {
        flush();
        bucket = { title: toString(node), nodes: [] };
        continue;
      }
      if (node.type === "mdxJsxFlowElement" && node.name === "ImageSequence") {
        flush();
        children.push(node);
        continue;
      }
      if (bucket) bucket.nodes.push(node);
      else children.push(node);
    }
    flush();
    tree.children = children;
  };
}
