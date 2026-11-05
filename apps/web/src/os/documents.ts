/**
 * A tiny document-open channel. The explorer and other apps can ask Notepad to
 * show a specific virtual text file without coupling the two apps together.
 */

export interface OpenDocument {
  name: string;
  text: string;
}

export const DOCUMENT_EVENT = 'frenos:open-document';

let pendingDocument: OpenDocument | null = null;

export function requestDocument(doc: OpenDocument): void {
  pendingDocument = doc;
  window.dispatchEvent(new CustomEvent<OpenDocument>(DOCUMENT_EVENT, { detail: doc }));
}

/** Notepad consumes the pending document when it mounts (e.g. after being closed). */
export function takePendingDocument(): OpenDocument | null {
  const doc = pendingDocument;
  pendingDocument = null;
  return doc;
}
