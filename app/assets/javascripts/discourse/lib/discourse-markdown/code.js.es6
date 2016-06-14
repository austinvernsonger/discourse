// Support for various code blocks
const TEXT_CODE_CLASSES = ["text", "pre", "plain"];

function codeFlattenBlocks(blocks) {
  let result = "";
  blocks.forEach(function(b) {
    result += b;
    if (b.trailing) { result += b.trailing; }
  });
  return result;
}

export function setup(helper) {

  const acceptableCodeClasses = Discourse.SiteSettings.highlighted_languages.split("|");
  if (Discourse.SiteSettings.highlighted_languages.length > 0) {
    var regexpSource = "^lang-(" + "nohighlight|auto|" + Discourse.SiteSettings.highlighted_languages + ")$";
    Discourse.Markdown.whiteListTag('code', 'class', new RegExp(regexpSource, "i"));
  }

  helper.replaceBlock({
    start: /^`{3}([^\n\[\]]+)?\n?([\s\S]*)?/gm,
    stop: /^```$/gm,
    withoutLeading: /\[quote/gm, //if leading text contains a quote this should not match
    emitter(blockContents, matches, opts) {
      let codeLang = opts.defaultCodeLang;
      if (acceptableCodeClasses && matches[1] && acceptableCodeClasses.indexOf(matches[1]) !== -1) {
        codeLang = matches[1];
      }

      if (TEXT_CODE_CLASSES.indexOf(matches[1]) !== -1) {
        return ['p', ['pre', ['code', {'class': 'lang-nohighlight'}, codeFlattenBlocks(blockContents) ]]];
      } else  {
        return ['p', ['pre', ['code', {'class': 'lang-' + codeLang}, codeFlattenBlocks(blockContents) ]]];
      }
    }
  });

  helper.replaceBlock({
    start: /(<pre[^\>]*\>)([\s\S]*)/igm,
    stop: /<\/pre>/igm,
    rawContents: true,
    skipIfTradtionalLinebreaks: true,

    emitter(blockContents) {
      return ['p', ['pre', codeFlattenBlocks(blockContents)]];
    }
  });

  // Ensure that content in a code block is fully escaped. This way it's not white listed
  // and we can use HTML and Javascript examples.
  helper.onParseNode(function(event) {
    const node = event.node,
    path = event.path;

    if (node[0] === 'code') {
      const regexp = (path && path[path.length-1] && path[path.length-1][0] && path[path.length-1][0] === "pre") ?
                     / +$/g : /^ +| +$/g;

      const contents = node[node.length-1];
      node[node.length-1] = Discourse.Utilities.escapeExpression(contents.replace(regexp,''));
    }
  });
}
