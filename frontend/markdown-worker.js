import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";

self.onmessage = ({ data }) => {
  try {
    self.postMessage({
      html: micromark(data, {
        extensions: [gfm()],
        htmlExtensions: [gfmHtml()],
      }),
    });
  } catch {
    self.postMessage({ error: "This file could not be rendered." });
  }
};
