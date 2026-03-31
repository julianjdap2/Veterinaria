import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'
import { Button } from './Button'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '<p></p>',
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if ((value || '<p></p>') !== current) {
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) {
    return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Cargando editor…</div>
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50/80 p-2">
        <Button size="sm" variant={editor.isActive('bold') ? 'primary' : 'secondary'} onClick={() => editor.chain().focus().toggleBold().run()}>
          B
        </Button>
        <Button size="sm" variant={editor.isActive('italic') ? 'primary' : 'secondary'} onClick={() => editor.chain().focus().toggleItalic().run()}>
          I
        </Button>
        <Button size="sm" variant={editor.isActive('heading', { level: 2 }) ? 'primary' : 'secondary'} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </Button>
        <Button size="sm" variant={editor.isActive('heading', { level: 3 }) ? 'primary' : 'secondary'} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </Button>
        <Button size="sm" variant={editor.isActive('bulletList') ? 'primary' : 'secondary'} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          Lista
        </Button>
      </div>
      <EditorContent editor={editor} className="prose prose-slate max-w-none min-h-[340px] p-4" />
    </div>
  )
}
