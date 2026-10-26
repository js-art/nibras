/**
 * Simplify saved rich-text image markup so TipTap can reliably restore src/attrs.
 * Older content used nested figure/div/img trees without data-type markers.
 */
export function normalizeEditorImageHtml(html: string): string {
  if (!html?.trim()) return html || '';

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(`<div id="rte-root">${html}</div>`, 'text/html');
    const root = doc.getElementById('rte-root');
    if (root) {
      return simplifyImageMarkupInRoot(root);
    }
  }

  return normalizeEditorImageHtmlFallback(html);
}

function simplifyImageMarkupInRoot(root: HTMLElement): string {
  const doc = root.ownerDocument;

  const buildSimpleFigure = (img: HTMLImageElement) => {
    const src = img.getAttribute('src')?.trim();
    if (!src) return null;

    const figure = doc.createElement('figure');
    figure.setAttribute('data-type', 'image');

    const widthAttr = img.getAttribute('width') || img.getAttribute('data-width');
    const styleWidth = img.style.width || figure.style.width;
    const parsedWidth = widthAttr ? parseInt(widthAttr, 10) : NaN;
    if (Number.isFinite(parsedWidth) && parsedWidth > 0) {
      figure.style.width = `${parsedWidth}px`;
      figure.style.maxWidth = '100%';
    } else if (styleWidth) {
      figure.style.width = styleWidth;
      figure.style.maxWidth = '100%';
    }

    const newImg = doc.createElement('img');
    newImg.setAttribute('src', src);
    const alt = img.getAttribute('alt');
    if (alt) newImg.setAttribute('alt', alt);
    if (widthAttr) newImg.setAttribute('width', widthAttr);

    figure.appendChild(newImg);

    const sourceFigure = img.closest('figure');
    const captionText = sourceFigure?.querySelector('figcaption')?.textContent?.trim();
    if (captionText) {
      const figcaption = doc.createElement('figcaption');
      figcaption.textContent = captionText;
      figure.appendChild(figcaption);
    }

    return figure;
  };

  root.querySelectorAll('figure').forEach((figure) => {
    const img = figure.querySelector('img');
    if (!img) return;
    const simplified = buildSimpleFigure(img);
    if (simplified) figure.replaceWith(simplified);
  });

  root.querySelectorAll('img').forEach((img) => {
    if (img.closest('figure')) return;
    const simplified = buildSimpleFigure(img);
    if (simplified) img.replaceWith(simplified);
  });

  return root.innerHTML;
}

/** Server-safe fallback when DOMParser is unavailable. */
function normalizeEditorImageHtmlFallback(html: string): string {
  return html.replace(/<figure\b[\s\S]*?<\/figure>/gi, (figureHtml) => {
    const srcMatch = figureHtml.match(/\ssrc=["']([^"']+)["']/i);
    if (!srcMatch?.[1]) return figureHtml;

    const src = srcMatch[1];
    const widthMatch =
      figureHtml.match(/\bwidth=["'](\d+)["']/i) ||
      figureHtml.match(/\bdata-width=["'](\d+)["']/i);
    const captionMatch = figureHtml.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
    const captionText = captionMatch?.[1]?.replace(/<[^>]+>/g, '').trim();

    let simplified = `<figure data-type="image"`;
    if (widthMatch?.[1]) {
      simplified += ` style="width: ${widthMatch[1]}px; max-width: 100%;"`;
    }
    simplified += `><img src="${src}"`;
    if (widthMatch?.[1]) simplified += ` width="${widthMatch[1]}"`;
    simplified += `>`;
    if (captionText) {
      simplified += `<figcaption>${captionText}</figcaption>`;
    }
    simplified += `</figure>`;
    return simplified;
  });
}

/** Allow hot-linked description images (e.g. Digikala CDN) to load in the browser. */
export function withDescriptionImageReferrerPolicy(html: string): string {
  if (!html?.trim()) return html || '';
  if (/\breferrerpolicy=/i.test(html)) return html;
  return html.replace(/<img\b/gi, '<img referrerpolicy="no-referrer"');
}
