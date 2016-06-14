import md5 from 'discourse/plugins/poll/lib/md5';

const DATA_PREFIX = "data-poll-";
const DEFAULT_POLL_NAME = "poll";
const WHITELISTED_ATTRIBUTES = ["type", "name", "min", "max", "step", "order", "status", "public"];
const ATTRIBUTES_REGEX = new RegExp("(" + WHITELISTED_ATTRIBUTES.join("|") + ")=['\"]?[^\\s\\]]+['\"]?", "g");

export function setup(helper) {
  Discourse.Markdown.whiteListTag("div", "class", "poll");
  Discourse.Markdown.whiteListTag("div", "class", /^poll-(info|container|buttons)/);
  Discourse.Markdown.whiteListTag("div", "data-*");
  Discourse.Markdown.whiteListTag("span", "class", /^info-(number|text)/);
  Discourse.Markdown.whiteListTag("a", "class", /^button (cast-votes|toggle-results)/);
  Discourse.Markdown.whiteListTag("li", "data-*");

  helper.replaceBlock({
    start: /\[poll((?:\s+\w+=[^\s\]]+)*)\]([\s\S]*)/igm,
    stop: /\[\/poll\]/igm,

    emitter(blockContents, matches) {
      const contents = [];

      // post-process inside block contents
      if (blockContents.length) {
        const postProcess = bc => {
          if (typeof bc === "string" || bc instanceof String) {
            const processed = this.processInline(String(bc));
            if (processed.length) {
              contents.push(["p"].concat(processed));
            }
          } else {
            contents.push(bc);
          }
        };

        let b;
        while ((b = blockContents.shift()) !== undefined) {
          this.processBlock(b, blockContents).forEach(postProcess);
        }
      }

      // Disable dialect when poll plugin is disabled
      if (!Discourse.SiteSettings.poll_enabled) { return ["div"].concat(contents); }

      // default poll attributes
      const attributes = { "class": "poll" };
      attributes[DATA_PREFIX + "status"] = "open";
      attributes[DATA_PREFIX + "name"] = DEFAULT_POLL_NAME;

      // extract poll attributes
      (matches[1].match(ATTRIBUTES_REGEX) || []).forEach(function(m) {
        const [ name, value ] = m.split("=");
        const escaped = Handlebars.Utils.escapeExpression(value.replace(/["']/g, ""));
        attributes[DATA_PREFIX + name] = escaped;
      });

      // we might need these values later...
      let min = parseInt(attributes[DATA_PREFIX + "min"], 10);
      let max = parseInt(attributes[DATA_PREFIX + "max"], 10);
      let step = parseInt(attributes[DATA_PREFIX + "step"], 10);

      // generate the options when the type is "number"
      if (attributes[DATA_PREFIX + "type"] === "number") {
        // default values
        if (isNaN(min)) { min = 1; }
        if (isNaN(max)) { max = Discourse.SiteSettings.poll_maximum_options; }
        if (isNaN(step)) { step = 1; }
        // dynamically generate options
        contents.push(["bulletlist"]);
        for (let o = min; o <= max; o += step) {
          contents[0].push(["listitem", String(o)]);
        }
      }

      // make sure there's only 1 child and it's a list with at least 1 option
      if (contents.length !== 1 || contents[0].length <= 1 || (contents[0][0] !== "numberlist" && contents[0][0] !== "bulletlist")) {
        return ["div"].concat(contents);
      }

      // make sure there's only options in the list
      for (let o=1; o < contents[0].length; o++) {
        if (contents[0][o][0] !== "listitem") {
          return ["div"].concat(contents);
        }
      }

      // TODO: remove non whitelisted content

      // add option id (hash)
      for (let o = 1; o < contents[0].length; o++) {
        const attr = {};
        // compute md5 hash of the content of the option
        attr[DATA_PREFIX + "option-id"] = md5(JSON.stringify(contents[0][o].slice(1)));
        // store options attributes
        contents[0][o].splice(1, 0, attr);
      }

      const result = ["div", attributes],
      poll = ["div"];

      // 1 - POLL CONTAINER
      const container = ["div", { "class": "poll-container" }].concat(contents);
      poll.push(container);

      // 2 - POLL INFO
      const info = ["div", { "class": "poll-info" }];

      // # of voters
      info.push(["p",
          ["span", { "class": "info-number" }, "0"],
          ["span", { "class": "info-text"}, I18n.t("poll.voters", { count: 0 })]
      ]);

      // multiple help text
      if (attributes[DATA_PREFIX + "type"] === "multiple") {
        const optionCount = contents[0].length - 1;

        // default values
        if (isNaN(min) || min < 1) { min = 1; }
        if (isNaN(max) || max > optionCount) { max = optionCount; }

        // add some help text
        let help;

        if (max > 0) {
          if (min === max) {
            if (min > 1) {
              help = I18n.t("poll.multiple.help.x_options", { count: min });
            }
          } else if (min > 1) {
            if (max < optionCount) {
              help = I18n.t("poll.multiple.help.between_min_and_max_options", { min: min, max: max });
            } else {
              help = I18n.t("poll.multiple.help.at_least_min_options", { count: min });
            }
          } else if (max <= optionCount) {
            help = I18n.t("poll.multiple.help.up_to_max_options", { count: max });
          }
        }

        if (help) { info.push(["p", help]); }
      }

      if (attributes[DATA_PREFIX + "public"] === "true") {
        info.push(["p", I18n.t("poll.public.title")]);
      }

      poll.push(info);

      // 3 - BUTTONS
      const buttons = ["div", { "class": "poll-buttons" }];

      // add "cast-votes" button
      if (attributes[DATA_PREFIX + "type"] === "multiple") {
        buttons.push(["a", { "class": "button cast-votes", "title": I18n.t("poll.cast-votes.title") }, I18n.t("poll.cast-votes.label")]);
      }

      // add "toggle-results" button
      buttons.push(["a", { "class": "button toggle-results", "title": I18n.t("poll.show-results.title") }, I18n.t("poll.show-results.label")]);

      // 4 - MIX IT ALL UP
      result.push(poll);
      result.push(buttons);

      return result;
    }
  });
}
