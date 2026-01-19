import React, { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Edit2, Save, X, Bold, Italic, List, AlignLeft, Indent, Outdent, Type } from 'lucide-react';

interface UpdateCardProps {
  isAdmin: boolean;
}

export const UpdateCard: React.FC<UpdateCardProps> = ({ isAdmin }) => {
  const [htmlContent, setHtmlContent] = useState('<div style="font-size: 1.5rem; font-weight: 800;">Loading updates...</div>');
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Sync with Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system", "updates"), (snap) => {
      if (snap.exists() && snap.data().content) {
        setHtmlContent(snap.data().content);
      } else {
        // Default content if none exists
        setHtmlContent('<div style="font-size: 1.875rem; font-weight: 800;">Admin Panel & Smart Badges</div>');
      }
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!contentRef.current) return;
    const cleanHtml = contentRef.current.innerHTML;
    try {
      await setDoc(doc(db, "system", "updates"), { content: cleanHtml }, { merge: true });
      setIsEditing(false);
    } catch (e) {
      alert("Error saving: " + e);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if(contentRef.current) contentRef.current.innerHTML = htmlContent;
  };

  const exec = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if(contentRef.current) contentRef.current.focus();
  };

  // Prevent buttons from stealing focus from the editable div
  const onMouseDown = (e: React.MouseEvent) => e.preventDefault();

  const colors = ['#ffffff', '#cbd5e1', '#2dd4bf', '#f43f5e', '#fb923c', '#facc15', '#4ade80', '#60a5fa', '#a78bfa', '#e879f9'];

  return (
    <div className="w-[525px] max-w-[90vw] p-10 bg-slate-900/80 backdrop-blur-xl border border-teal-400/10 rounded-3xl text-left mt-4 shadow-2xl relative group transition-all">
      <style>{`
        .update-content ul { list-style-type: disc; padding-left: 1.5em; margin: 0.5em 0; }
        .update-content ol { list-style-type: decimal; padding-left: 1.5em; margin: 0.5em 0; }
        .update-content li { margin-bottom: 0.25em; }
        .update-content b, .update-content strong { font-weight: 800; }
        .update-content i, .update-content em { font-style: italic; }
        
        /* Custom Scrollbar for Update Card */
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 3px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(45, 212, 191, 0.3); border-radius: 3px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(45, 212, 191, 0.6); }
      `}</style>

      <div className="flex justify-between items-start mb-5">
        <div className="text-xl font-bold text-slate-400 uppercase tracking-widest select-none">
          CHANGE LOG
        </div>
        
        {isAdmin && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-teal-400 hover:text-white p-2"
            title="Edit Update Log"
          >
            <Edit2 size={20} />
          </button>
        )}

        {isAdmin && isEditing && (
            <div className="flex gap-2">
                <button onMouseDown={onMouseDown} onClick={handleSave} className="bg-teal-500 text-black p-1.5 rounded hover:bg-teal-400" title="Save"><Save size={18}/></button>
                <button onMouseDown={onMouseDown} onClick={handleCancel} className="bg-rose-500 text-white p-1.5 rounded hover:bg-rose-400" title="Cancel"><X size={18}/></button>
            </div>
        )}
      </div>

      {isEditing && (
        <div className="mb-4 p-3 bg-slate-800/80 rounded-xl flex flex-wrap gap-2 border border-white/10 shadow-inner">
            {/* Formatting */}
            <button onMouseDown={onMouseDown} onClick={() => exec('bold')} className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded" title="Bold"><Bold size={16}/></button>
            <button onMouseDown={onMouseDown} onClick={() => exec('italic')} className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded" title="Italic"><Italic size={16}/></button>
            
            <div className="w-px bg-white/10 mx-1"></div>
            
            {/* Sizes */}
            <button onMouseDown={onMouseDown} onClick={() => exec('fontSize', '2')} className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded font-bold">S</button>
            <button onMouseDown={onMouseDown} onClick={() => exec('fontSize', '3')} className="px-2 py-1 text-sm text-slate-300 hover:text-white hover:bg-white/10 rounded font-bold">M</button>
            <button onMouseDown={onMouseDown} onClick={() => exec('fontSize', '5')} className="px-2 py-1 text-lg text-slate-300 hover:text-white hover:bg-white/10 rounded font-bold">L</button>
            <button onMouseDown={onMouseDown} onClick={() => exec('fontSize', '7')} className="px-2 py-1 text-xl text-slate-300 hover:text-white hover:bg-white/10 rounded font-bold">XL</button>

            <div className="w-px bg-white/10 mx-1"></div>

            {/* Lists */}
            <button onMouseDown={onMouseDown} onClick={() => exec('insertUnorderedList')} className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded" title="Bullet List"><List size={16}/></button>
            <button onMouseDown={onMouseDown} onClick={() => exec('indent')} className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded" title="Indent"><Indent size={16}/></button>
            <button onMouseDown={onMouseDown} onClick={() => exec('outdent')} className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded" title="Outdent"><Outdent size={16}/></button>

            {/* Colors */}
            <div className="w-full h-px bg-white/10 my-1"></div>
            <div className="flex gap-1.5 flex-wrap">
                {colors.map(c => (
                    <button 
                        key={c}
                        onMouseDown={onMouseDown}
                        onClick={() => exec('foreColor', c)}
                        className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                        title={c}
                    />
                ))}
            </div>
        </div>
      )}

      <div 
        ref={contentRef}
        contentEditable={isEditing}
        className={`custom-scroll update-content text-white outline-none min-h-[50px] max-h-[250px] overflow-y-auto pr-2 transition-all ${isEditing ? 'ring-2 ring-teal-500/30 rounded-lg p-3 bg-black/20 cursor-text' : isAdmin ? 'cursor-pointer hover:opacity-80' : ''}`}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        onClick={() => isAdmin && !isEditing && setIsEditing(true)}
        title={isAdmin && !isEditing ? "Click to edit" : ""}
      />
    </div>
  );
};