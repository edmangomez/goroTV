import React from 'react';
import { X, Sliders } from 'lucide-react';
import { SubtitleStyle } from '../../types';

interface SubtitleStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  style: SubtitleStyle;
  onChangeStyle: (style: SubtitleStyle) => void;
}

export const SubtitleStyleModal: React.FC<SubtitleStyleModalProps> = ({
  isOpen,
  onClose,
  style,
  onChangeStyle,
}) => {
  if (!isOpen) return null;

  const currentFontSize = style.fontSize || 'medium';
  const currentColor = style.color || 'white';
  const currentBackground = style.background || 'semi';
  const currentLineHeight = style.lineHeight || 'normal';
  const currentEdgeStyle = style.edgeStyle || 'outline';
  const currentPosition = style.position || 'bottom';

  const lineHeightValue =
    currentLineHeight === 'compact' ? 1.15 : currentLineHeight === 'relaxed' ? 1.6 : 1.35;

  let textShadowValue = 'none';
  if (currentEdgeStyle === 'outline') {
    textShadowValue =
      '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 2px 4px rgba(0,0,0,0.8)';
  } else if (currentEdgeStyle === 'shadow') {
    textShadowValue = '0 2px 4px rgba(0,0,0,0.9), 0 0 2px black';
  } else if (currentEdgeStyle === 'none') {
    textShadowValue = 'none';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-surfaceLight rounded-2xl w-full max-w-sm sm:max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surfaceLight flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-white text-sm">Personalizar Subtítulos</h3>
          </div>
          <button
            onClick={onClose}
            data-nav="true"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surfaceLight transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content with vertical scroll */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Preview Box */}
          <div
            className={`p-4 bg-black rounded-xl border border-surfaceLight flex ${
              currentPosition === 'middle' ? 'items-center' : 'items-end'
            } justify-center min-h-[110px] text-center transition-all`}
          >
            <span
              style={{
                display: 'inline-block',
                fontSize:
                  currentFontSize === 'small' ? '15px' : currentFontSize === 'large' ? '22px' : '18px',
                color:
                  currentColor === 'yellow' ? '#FACC15' : currentColor === 'cyan' ? '#22D3EE' : '#FFFFFF',
                lineHeight: lineHeightValue,
                backgroundColor:
                  currentBackground === 'solid'
                    ? '#000000'
                    : currentBackground === 'semi'
                    ? 'rgba(0,0,0,0.75)'
                    : 'transparent',
                textShadow: textShadowValue,
                padding: '4px 10px',
                borderRadius: '4px',
                fontWeight: 700,
              }}
            >
              Ejemplo de subtítulo en goroTV
              <br />
              Segunda línea para probar interlineado
            </span>
          </div>

          {/* Tamaño de Fuente */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Tamaño de Fuente</label>
            <div className="grid grid-cols-3 gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  data-nav="true"
                  onClick={() => onChangeStyle({ ...style, fontSize: size })}
                  className={`py-2 rounded-xl font-bold transition-all border ${
                    currentFontSize === size
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-background text-slate-400 border-surfaceLight hover:text-white'
                  }`}
                >
                  {size === 'small' ? 'Pequeño' : size === 'medium' ? 'Normal' : 'Grande'}
                </button>
              ))}
            </div>
          </div>

          {/* Interlineado */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Interlineado</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'compact', label: 'Compacto' },
                { id: 'normal', label: 'Normal' },
                { id: 'relaxed', label: 'Amplio' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-nav="true"
                  onClick={() => onChangeStyle({ ...style, lineHeight: item.id as any })}
                  className={`py-2 rounded-xl font-bold transition-all border ${
                    currentLineHeight === item.id
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-background text-slate-400 border-surfaceLight hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Borde / Contorno */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Borde / Contorno</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'outline', label: 'Nítido' },
                { id: 'shadow', label: 'Sombra' },
                { id: 'none', label: 'Ninguno' },
              ].map((edge) => (
                <button
                  key={edge.id}
                  type="button"
                  data-nav="true"
                  onClick={() => onChangeStyle({ ...style, edgeStyle: edge.id as any })}
                  className={`py-2 rounded-xl font-bold transition-all border ${
                    currentEdgeStyle === edge.id
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-background text-slate-400 border-surfaceLight hover:text-white'
                  }`}
                >
                  {edge.label}
                </button>
              ))}
            </div>
          </div>

          {/* Posición */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Posición</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'bottom', label: 'Baja' },
                { id: 'middle', label: 'Media' },
              ].map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  data-nav="true"
                  onClick={() => onChangeStyle({ ...style, position: pos.id as any })}
                  className={`py-2 rounded-xl font-bold transition-all border ${
                    currentPosition === pos.id
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-background text-slate-400 border-surfaceLight hover:text-white'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color del Texto */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Color del Texto</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'white', label: 'Blanco', colorClass: 'text-white' },
                { id: 'yellow', label: 'Amarillo', colorClass: 'text-yellow-400' },
                { id: 'cyan', label: 'Cian', colorClass: 'text-cyan-400' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  data-nav="true"
                  onClick={() => onChangeStyle({ ...style, color: c.id as any })}
                  className={`py-2 rounded-xl font-bold transition-all border flex items-center justify-center gap-1.5 ${
                    currentColor === c.id
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                      : 'bg-background text-slate-400 border-surfaceLight hover:text-white'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${c.colorClass} bg-current inline-block`} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fondo de Lectura */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Fondo de Lectura</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'none', label: 'Transparente' },
                { id: 'semi', label: 'Semitransp.' },
                { id: 'solid', label: 'Negro Sólido' },
              ].map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  data-nav="true"
                  onClick={() => onChangeStyle({ ...style, background: bg.id as any })}
                  className={`py-2 rounded-xl font-bold transition-all border ${
                    currentBackground === bg.id
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-background text-slate-400 border-surfaceLight hover:text-white'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surfaceLight flex justify-end shrink-0">
          <button
            type="button"
            data-nav="true"
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
