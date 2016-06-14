export function setup(helper) {
  helper.inlineRegexp({
    start: '#',
    matcher: /^#([\w-:]{1,101})/i,
    spaceOrTagBoundary: true,

    emitter(matches, options) {
      const [hashtag, slug] = matches;
      const categoryHashtagLookup = options.categoryHashtagLookup;
      const result = categoryHashtagLookup && categoryHashtagLookup(slug);

      return result ? ['a', { class: 'hashtag', href: result[0] }, '#', ["span", {}, result[1]]]
                    : ['span', { class: 'hashtag' }, hashtag];
    }
  });
}
