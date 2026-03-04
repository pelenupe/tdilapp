import { useEffect, useRef, useCallback } from 'react';

/**
 * Lightweight rich text editor using contenteditable.
 * No external dependencies required.
 * Stores output as HTML, renders HTML safely on display.
 */
export default function RichTextEditor({ value, onChange, placeholder = 'Write something…', minHeight = 120 }) {
  const editorRef = useRef(null);
  const isInternalChange = useRef(false);

  // Sync value → DOM (only when value changes externally)
  useEffect(() => {
    if (!editorRef.current) return;
    const current = editorRef.current.innerHTML;
    // Avoid cursor jump on every keystroke
    if (!isInternalChange.current && current !== value) {
      editorRef.current.innerHTML = value || '';
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const html = editorRef.current.innerHTML;
    // Treat empty-looking HTML as empty string
    const isEmpty = html === '' || html === '<br>' || html === '<div><br></div>';
    onChange(isEmpty ? '' : html);
  }, [onChange]);

  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    handleInput();
  };

  const insertLink = () => {
    const url = window.prompt('Enter URL:', 'https://');
    if (url) exec('createLink', url);
  };

  const btnClass = "px-2 py-1 text-xs font-medium rounded hover:bg-gray-200 transition-colors border border-transparent hover:border-gray-300";

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 flex-wrap">
        <button type="button" title="Bold" onClick={() => exec('bold')} className={btnClass}>
          <strong>B</strong>
        </button>
        <button type="button" title="Italic" onClick={() => exec('italic')} className={btnClass}>
          <em>I</em>
        </button>
        <button type="button" title="Underline" onClick={() => exec('underline')} className={btnClass}>
          <span style={{ textDecoration: 'underline' }}>U</span>
        </button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button type="button" title="Bullet list" onClick={() => exec('insertUnorderedList')} className={btnClass}>
          ≡ •
        </button>
        <button type="button" title="Numbered list" onClick={() => exec('insertOrderedList')} className={btnClass}>
          ≡ 1.
        </button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button type="button" title="Link" onClick={insertLink} className={btnClass}>
          🔗
        </button>
        <button type="button" title="Remove formatting" onClick={() => exec('removeFormat')} className={`${btnClass} text-gray-500`}>
          T̶
        </button>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className="px-3 py-2 text-sm text-gray-800 focus:outline-none leading-relaxed
          [&_strong]:font-bold [&_em]:italic [&_u]:underline
          [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4
          [&_a]:text-blue-600 [&_a]:underline
          empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
      />
    </div>
  );
}

/**
 * Read-only renderer for rich text HTML.
 * Use this anywhere you display a bio/about field.
 */
export function RichTextDisplay({ html, className = '' }) {
  if (!html) return null;
  return (
    <div
      className={`text-sm text-gray-700 leading-relaxed
        [&_strong]:font-bold [&_em]:italic [&_u]:underline
        [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-1
        [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:my-1
        [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800
        [&_br]:block [&_p]:mb-1 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
