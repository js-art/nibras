export type EditorFeature =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'heading'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'blockquote'
  | 'codeBlock'
  | 'link'
  | 'image'
  | 'textAlign'
  | 'horizontalRule'
  | 'undo'
  | 'redo'
  | 'clearFormatting'
  | 'color'
  | 'highlight'
  | 'table'
  | 'subscript'
  | 'superscript'
  | 'fontFamily'
  | 'fontSize';

export interface ImageConfig {
  enableLibrary?: boolean;
  enableUpload?: boolean;
  maxSize?: number;
}

export interface LinkConfig {
  openInNewTab?: boolean;
  noFollow?: boolean;
}

export interface SeoConfig {
  enableAnalysis?: boolean;
  autoPopulate?: boolean;
}

export interface RichTextEditorProps {
  content?: string;
  /** Remount editor when loading a different persisted document (e.g. product id). */
  contentKey?: string;
  onChange?: (html: string, json?: any) => void;
  placeholder?: string;
  enabledFeatures?: EditorFeature[];
  disabledFeatures?: EditorFeature[];
  className?: string;
  height?: string | number;
  editable?: boolean;
  showToolbar?: boolean;
  customToolbar?: React.ReactNode;
  rtl?: boolean;
  imageConfig?: ImageConfig;
  linkConfig?: LinkConfig;
  seoConfig?: SeoConfig;
  /** Match storefront typography: blog posts vs product long description */
  contentTypography?: 'blog' | 'product';
}

