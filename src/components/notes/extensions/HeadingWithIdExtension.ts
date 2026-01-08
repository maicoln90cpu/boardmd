import Heading from '@tiptap/extension-heading';

/**
 * Custom Heading extension that preserves 'id' attributes.
 * 
 * This is essential for Table of Contents (TOC) functionality where
 * the AI generates headings with IDs like <h2 id="section-1">Title</h2>
 * and links that reference them like <a href="#section-1">.
 * 
 * Without this extension, TipTap strips the 'id' attribute from headings,
 * breaking anchor link navigation.
 */
export const HeadingWithId = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: element => element.getAttribute('id'),
        renderHTML: attributes => {
          if (!attributes.id) return {};
          return { id: attributes.id };
        },
      },
    };
  },
});
