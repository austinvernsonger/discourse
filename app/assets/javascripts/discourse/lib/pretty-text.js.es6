import { cook } from 'discourse/lib/discourse-markdown';

export default class {
  constructor(opts) {
    this.opts = opts || {};
  }

  cook(raw) {
    const { opts } = this;
    if (!raw || raw.length === 0) { return ""; }

    const cookArgs = { sanitize: !!opts.sanitize,
                       traditionalMarkdownLinebreaks: opts.traditionalMarkdownLinebreaks,
                       defaultCodeLang: opts.defaultCodeLang || Discourse.SiteSettings.default_code_lang,
                       topicId: opts.topicId,
                       lookupAvatar: opts.lookupAvatar,
                       mentionLookup: opts.mentionLookup,
                       categoryHashtagLookup: opts.categoryHashtagLookup,
                       sanitizerFunction: opts.sanitizerFunction };

    const result = cook(raw, cookArgs);
    return result ? result : "";
  }
};
