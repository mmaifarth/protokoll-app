import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Clock,
  Plus,
  Trash2,
  Printer,
  Download,
  RotateCcw,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';

// ============================================================================
// STAMMDATEN: 43 KONSTITUIERTE FACHSCHAFTSVERTRETUNGEN INKL. STIMMGEWICHTE
// ============================================================================

const DEFAULT_FACHSCHAFTEN = [
  { nr: '01', name: 'Katholische Theologie', weight: 2 },
  { nr: '02', name: 'Evangelische Theologie', weight: 1 },
  { nr: '03', name: 'Jura', weight: 23 },
  { nr: '04', name: 'Betriebswirtschaft', weight: 13 },
  { nr: '05', name: 'Volkswirtschaft', weight: 9 },
  { nr: '06', name: 'Medizin', weight: 23 },
  { nr: '07', name: 'Zahnmedizin', weight: 3 },
  { nr: '08', name: 'Tiermedizin', weight: 8 },
  { nr: '09', name: 'Geschichte', weight: 6 },
  { nr: '10', name: 'Kunstgeschichte', weight: 2 },
  { nr: '11', name: 'Bildende Kunst', weight: 1 },
  { nr: '12', name: 'Musikwissenschaft', weight: 1 },
  { nr: '13', name: 'Theaterwissenschaft', weight: 2 },
  { nr: '14', name: 'Philosophie', weight: 3 },
  { nr: '16', name: 'Grundschul- und Sonderpädagogik', weight: 11 },
  { nr: '17', name: 'Pädagogik', weight: 4 },
  { nr: '18', name: 'Psychologie', weight: 4 },
  { nr: '19', name: 'Schulpsychologie', weight: 1 },
  { nr: '24', name: 'Sinologie/Indologie/Tibetologie', weight: 1 },
  { nr: '25', name: 'Ethnologie', weight: 2 },
  { nr: '26', name: 'Kulturwissenschaft', weight: 1 },
  { nr: '27', name: 'Amerikanistik', weight: 1 },
  { nr: '28', name: 'Anglistik', weight: 7 },
  { nr: '29', name: 'Computerlinguistik', weight: 2 },
  { nr: '31', name: 'Germanistik', weight: 8 },
  { nr: '33', name: 'Klassische Philologie', weight: 1 },
  { nr: '34', name: 'Allgemeine und Vergleichende Literaturwissenschaft', weight: 2 },
  { nr: '35', name: 'Skandinavistik/Buchwissenschaften', weight: 1 },
  { nr: '36', name: 'Romanistik', weight: 2 },
  { nr: '38', name: 'Sprachwissenschaften', weight: 2 },
  { nr: '39', name: 'Kommunikationswissenschaft', weight: 4 },
  { nr: '40', name: 'Politische Wissenschaft', weight: 6 },
  { nr: '41', name: 'Soziologie', weight: 4 },
  { nr: '42', name: 'Bioinformatik', weight: 2 },
  { nr: '43', name: 'Informatik', weight: 10 },
  { nr: '44', name: 'Mathematik', weight: 5 },
  { nr: '46', name: 'Statistik und Data Science', weight: 5 },
  { nr: '48', name: 'Physik', weight: 9 },
  { nr: '49', name: 'Chemie', weight: 4 },
  { nr: '50', name: 'Pharmazie', weight: 4 },
  { nr: '51', name: 'Biologie', weight: 8 },
  { nr: '52', name: 'Geographie', weight: 4 },
  { nr: '53', name: 'Geowissenschaften', weight: 2 }
];

const formatFsLabel = (fs) => `${fs.nr} ${fs.name}`;

const extractFsNr = (labelOrNr) => {
  if (!labelOrNr) return '';
  const match = String(labelOrNr).trim().match(/^(\d{1,2})\b/);
  return match ? match[1].padStart(2, '0') : String(labelOrNr).trim();
};

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (err) {
      console.warn('Auto-Save in localStorage fehlgeschlagen:', err);
    }
  }, [key, state]);

  return [state, setState];
}

const assetUrl = (filename) => {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${filename}`;
};

const slugify = (text) => {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

const calculateShare = (value, total) => {
  if (total <= 0) return '0.0';
  return ((value / total) * 100).toFixed(1);
};

// Deutsches Prozentformat mit bis zu 3 Nachkommastellen ohne unnötige Endnullen (wie in Anhang 1: 84,53 %, 85,366 %, 0 %)
const formatGermanPercent = (value, total) => {
  if (!total || total <= 0 || !value) return '0';
  const rounded = Number(((value / total) * 100).toFixed(3));
  return rounded.toLocaleString('de-DE', { maximumFractionDigits: 3 });
};

// Sanitizer für mehrzeilige Texte/HTML aus CSV-Dateien
const sanitizeRichText = (rawText) => {
  if (!rawText) return '';
  const withBreaks = String(rawText).replace(/\r?\n/g, '<br/>');
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return withBreaks.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(withBreaks, 'text/html');
  const allowedTags = new Set([
    'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'UL', 'OL', 'LI',
    'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'CODE', 'PRE', 'SPAN', 'DIV',
    'SUB', 'SUP', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'A', 'HR'
  ]);

  const cleanNode = (node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!allowedTags.has(child.tagName)) {
          const textNode = doc.createTextNode(child.textContent || '');
          node.replaceChild(textNode, child);
          continue;
        }
        const attrs = Array.from(child.attributes);
        for (const attr of attrs) {
          const name = attr.name.toLowerCase();
          const val = attr.value.trim().toLowerCase();
          if (name.startsWith('on') || name === 'style') {
            child.removeAttribute(attr.name);
          } else if (name === 'href' && (val.startsWith('javascript:') || val.startsWith('data:'))) {
            child.removeAttribute(attr.name);
          } else if (!['href', 'target', 'rel', 'colspan', 'rowspan'].includes(name)) {
            child.removeAttribute(attr.name);
          }
        }
        cleanNode(child);
      }
    }
  };

  cleanNode(doc.body);
  return doc.body.innerHTML;
};

// RFC-4180-konformer CSV-Parser (unterstützt Zeilenumbrüche innerhalb von "..." sowie ; und ,)
const parseCSV = (rawText) => {
  const csvText = (rawText || '').replace(/^\uFEFF/, '');
  if (!csvText.trim()) return [];

  let inQ = false;
  let semicolons = 0;
  let commas = 0;
  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch === ';') semicolons++;
    else if (!inQ && ch === ',') commas++;
    else if (!inQ && (ch === '\n' || ch === '\r')) break;
  }
  const separator = semicolons >= commas ? ';' : ',';

  const rows = [];
  let currentRow = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === separator) {
      currentRow.push(cell.trim());
      cell = '';
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && next === '\n') i++;
      currentRow.push(cell.trim());
      cell = '';
      if (currentRow.some((val) => val !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      cell += char;
    }
  }

  currentRow.push(cell.trim());
  if (currentRow.some((val) => val !== '')) {
    rows.push(currentRow);
  }
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.replace(/^\uFEFF/, '').trim());
  return rows.slice(1).map((values) => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index] : '';
    });
    return row;
  });
};

// Berechnet aus der Einzelstimmen-Map ({ "01": "enthaltung", "03": "ja", ... }) alle Summen & Tabellenzeilen
const computeFromEinzelstimmen = (einzelstimmen = {}, fachschaften = DEFAULT_FACHSCHAFTEN) => {
  const fuer = { fs: 0, weight: 0 };
  const gegen = { fs: 0, weight: 0 };
  const enthaltung = { fs: 0, weight: 0 };
  const details = [];

  const sortedFs = [...fachschaften].sort((a, b) => a.nr.localeCompare(b.nr, 'de'));

  for (const fs of sortedFs) {
    const vote = einzelstimmen[fs.nr];
    if (!vote) continue;
    const w = Number(fs.weight) || 0;
    if (vote === 'ja') {
      fuer.fs += 1;
      fuer.weight += w;
      details.push({ nr: fs.nr, name: fs.name, weight: w, stimme: 'Ja', voteKey: 'ja' });
    } else if (vote === 'nein') {
      gegen.fs += 1;
      gegen.weight += w;
      details.push({ nr: fs.nr, name: fs.name, weight: w, stimme: 'Nein', voteKey: 'nein' });
    } else if (vote === 'enthaltung') {
      enthaltung.fs += 1;
      enthaltung.weight += w;
      details.push({ nr: fs.nr, name: fs.name, weight: w, stimme: 'Enthaltung', voteKey: 'enthaltung' });
    }
  }

  const totalFs = fuer.fs + gegen.fs + enthaltung.fs;
  const totalWeight = fuer.weight + gegen.weight + enthaltung.weight;
  // Gemäß § 69 (7) GrundO LMU gelten Enthaltungen als nicht abgegebene Stimmen:
  const castWeight = fuer.weight + gegen.weight;
  const castFs = fuer.fs + gegen.fs;

  let suggestedStatus = '';
  if (totalFs > 0) {
    if (castWeight > 0 && fuer.weight > gegen.weight && fuer.fs > gegen.fs) {
      suggestedStatus = 'angenommen';
    } else {
      suggestedStatus = 'abgelehnt';
    }
  }

  return {
    fuer,
    gegen,
    enthaltung,
    totalFs,
    totalWeight,
    castWeight,
    castFs,
    details,
    suggestedStatus
  };
};

const createInitialAbstimmung = (anwesendLabels = [], fachschaften = DEFAULT_FACHSCHAFTEN, defaultVote = 'ja') => {
  const einzelstimmen = {};
  if (defaultVote) {
    for (const label of anwesendLabels) {
      const nr = extractFsNr(label);
      if (nr) einzelstimmen[nr] = defaultVote;
    }
  }
  const calc = computeFromEinzelstimmen(einzelstimmen, fachschaften);
  return {
    modus: 'individuell',
    imAnhang: true,
    einzelstimmen,
    fuer: calc.fuer,
    gegen: calc.gegen,
    enthaltung: calc.enthaltung
  };
};

// ============================================================================
// KOMPONENTEN
// ============================================================================

// Multi-Select Dropdown mit Suchfilter und Schnell-Aktionen
const MultiSelect = ({ options, selected, onChange, placeholder, fachschaftenMap }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option].sort((a, b) => a.localeCompare(b, 'de')));
    }
  };

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="min-h-[42px] border border-gray-300 rounded-md p-2 flex flex-wrap gap-2 cursor-pointer bg-white text-base"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selected.length === 0 && <span className="text-gray-400">{placeholder}</span>}
        {selected.map((item) => {
          const nr = extractFsNr(item);
          const weight = fachschaftenMap?.get(nr)?.weight;
          return (
            <span
              key={item}
              className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-sm flex items-center gap-1"
            >
              <span>{item}</span>
              {weight !== undefined && (
                <span className="text-xs text-emerald-600 font-semibold">({weight})</span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOption(item);
                }}
                className="ml-1 text-emerald-600 hover:text-emerald-900 font-bold"
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-72 overflow-y-auto text-base">
          <div className="sticky top-0 bg-white p-2 border-b border-gray-200 flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="FS-Nr. oder Name filtern (z.B. 03, Jura)..."
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-600"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([...options].sort((a, b) => a.localeCompare(b, 'de')));
              }}
              className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded font-semibold"
            >
              Alle
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 px-2 py-1 rounded"
            >
              Leeren
            </button>
          </div>
          {filteredOptions.map((option) => {
            const nr = extractFsNr(option);
            const weight = fachschaftenMap?.get(nr)?.weight;
            return (
              <div
                key={option}
                className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center justify-between"
                onClick={() => toggleOption(option)}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    readOnly
                    className="mr-2 cursor-pointer accent-emerald-600"
                  />
                  <span>{option}</span>
                </div>
                {weight !== undefined && (
                  <span className="text-xs text-gray-500 font-medium">
                    Stimmgewicht: {weight}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Wiederverwendbarer Editor für Abstimmungen (Inhaltliche Anträge & GO-Anträge) nach § 7 (7) GO KF
const AbstimmungsEditor = ({
  abstimmung,
  status,
  onChangeAbstimmung,
  onChangeStatus,
  onRemoveAbstimmung,
  fachschaften,
  anwesendLabels,
  accentColor = 'emerald'
}) => {
  const [showAllFs, setShowAllFs] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [quickInput, setQuickInput] = useState('');

  const modus = abstimmung?.modus || 'individuell';
  const einzelstimmen = abstimmung?.einzelstimmen || {};
  const imAnhang = abstimmung?.imAnhang !== false;

  const anwesendNrs = new Set(anwesendLabels.map(extractFsNr));

  const applyEinzelstimmen = (nextEinzelstimmen, nextModus = 'individuell') => {
    const calc = computeFromEinzelstimmen(nextEinzelstimmen, fachschaften);
    onChangeAbstimmung({
      ...abstimmung,
      modus: nextModus,
      imAnhang: abstimmung?.imAnhang !== undefined ? abstimmung.imAnhang : true,
      einzelstimmen: nextEinzelstimmen,
      fuer: calc.fuer,
      gegen: calc.gegen,
      enthaltung: calc.enthaltung
    });
    if (calc.suggestedStatus && onChangeStatus) {
      onChangeStatus(calc.suggestedStatus);
    }
  };

  const setSingleFsVote = (nr, voteValue) => {
    const next = { ...einzelstimmen };
    if (!voteValue) {
      delete next[nr];
    } else {
      next[nr] = voteValue;
    }
    applyEinzelstimmen(next);
  };

  const setBulkAnwesend = (voteValue) => {
    const next = {};
    if (voteValue) {
      const targetNrs = anwesendNrs.size > 0
        ? Array.from(anwesendNrs)
        : fachschaften.map((f) => f.nr);
      for (const nr of targetNrs) {
        next[nr] = voteValue;
      }
    }
    applyEinzelstimmen(next);
  };

  // Verarbeitet Schnell-Eingaben wie "01 09 19 24" (mit Ziel-Button) oder Kurznotation "06n 24e 18-"
  const applyQuickBatch = (forcedVote = null) => {
    const raw = quickInput.trim();
    if (!raw) return;

    const next = { ...einzelstimmen };
    const tokens = raw.split(/[\s,;]+/).filter(Boolean);

    for (const token of tokens) {
      const match = token.match(/^(\d{1,2})([jne-]?)$/i);
      if (match) {
        const nr = match[1].padStart(2, '0');
        const suffix = (match[2] || '').toLowerCase();
        const exists = fachschaften.some((f) => f.nr === nr);
        if (!exists) continue;

        let targetVote = forcedVote;
        if (!targetVote) {
          if (suffix === 'j') targetVote = 'ja';
          else if (suffix === 'n') targetVote = 'nein';
          else if (suffix === 'e') targetVote = 'enthaltung';
          else if (suffix === '-') targetVote = null;
          else targetVote = 'enthaltung'; // Standard bei Enter: Abweichler auf Enthaltung
        }

        if (!targetVote || targetVote === 'none') {
          delete next[nr];
        } else {
          next[nr] = targetVote;
        }
      }
    }

    applyEinzelstimmen(next);
    setQuickInput('');
  };

  const handleManualChange = (type, field, value) => {
    const numVal = Math.max(0, Number(value) || 0);
    const next = {
      ...abstimmung,
      modus: 'manuell',
      [type]: {
        ...(abstimmung[type] || { fs: 0, weight: 0 }),
        [field]: numVal
      }
    };
    onChangeAbstimmung(next);
  };

  const totalFs =
    (abstimmung?.fuer?.fs || 0) +
    (abstimmung?.gegen?.fs || 0) +
    (abstimmung?.enthaltung?.fs || 0);
  const totalWeight =
    (abstimmung?.fuer?.weight || 0) +
    (abstimmung?.gegen?.weight || 0) +
    (abstimmung?.enthaltung?.weight || 0);

  // Zeige alle anwesenden FS + alle FS, die bereits eine Stimme in dieser Abstimmung haben (oder alle 43, falls umgeschaltet)
  const visibleFachschaften = fachschaften.filter((fs) => {
    const matchesSearch =
      !filterText.trim() ||
      fs.nr.includes(filterText.trim()) ||
      fs.name.toLowerCase().includes(filterText.trim().toLowerCase());
    if (!matchesSearch) return false;
    if (showAllFs || anwesendNrs.size === 0) return true;
    return anwesendNrs.has(fs.nr) || Boolean(einzelstimmen[fs.nr]);
  });

  const borderClass = accentColor === 'orange' ? 'border-orange-200' : 'border-emerald-200';

  return (
    <div className={`mt-4 bg-white p-4 rounded-lg border ${borderClass} space-y-4`}>
      {/* Kopfzeile des Abstimmungs-Editors */}
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-gray-100 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h5 className="text-base font-bold text-gray-800">
            Abstimmungsergebnis (§ 7 Abs. 7 GO KF)
          </h5>
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                if (modus !== 'individuell') {
                  const hasVotes = Object.keys(einzelstimmen).length > 0;
                  if (hasVotes) {
                    applyEinzelstimmen(einzelstimmen, 'individuell');
                  } else {
                    onChangeAbstimmung({ ...abstimmung, modus: 'individuell' });
                  }
                }
              }}
              className={`px-2.5 py-1 ${
                modus === 'individuell'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Individuell (Fachschaften)
            </button>
            <button
              type="button"
              onClick={() => onChangeAbstimmung({ ...abstimmung, modus: 'manuell' })}
              className={`px-2.5 py-1 ${
                modus === 'manuell'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Manuell (Nur Summen)
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {modus === 'individuell' && (
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={imAnhang}
                onChange={(e) =>
                  onChangeAbstimmung({ ...abstimmung, imAnhang: e.target.checked })
                }
                className="accent-emerald-700 w-4 h-4"
              />
              In Anhang (Abstimmungsübersicht) aufnehmen
            </label>
          )}
          {onChangeStatus && (
            <select
              value={status || ''}
              onChange={(e) => onChangeStatus(e.target.value)}
              className="text-xs font-bold border border-gray-300 rounded px-2.5 py-1.5 bg-gray-50"
            >
              <option value="">— Status wählen —</option>
              <option value="angenommen">angenommen</option>
              <option value="abgelehnt">abgelehnt</option>
              <option value="ohne Gegenrede angenommen">ohne Gegenrede angenommen</option>
              <option value="vertagt">vertagt</option>
              <option value="zurückgezogen">zurückgezogen</option>
            </select>
          )}
          {onRemoveAbstimmung && (
            <button
              type="button"
              onClick={onRemoveAbstimmung}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              title="Abstimmung entfernen"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Live-Summenblock (wie in Anhang 1) */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-md p-3 text-sm space-y-1">
        <div className="flex flex-wrap justify-between items-center gap-2 font-bold text-emerald-950">
          <span>
            Gültige Stimmen gesamt (Stimmgewichte): {totalWeight} | Teilnehmende Fachschaften: {totalFs}
          </span>
          <span className="text-xs font-normal text-gray-600">
            Abgegebene Stimmen ohne Enth. (§ 69 (7) GrundO):{' '}
            <strong>{(abstimmung?.fuer?.weight || 0) + (abstimmung?.gegen?.weight || 0)}</strong>
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-xs">
          <div className="bg-white px-2.5 py-1.5 rounded border border-emerald-200">
            <strong className="text-emerald-800">JA:</strong> Gewichte:{' '}
            <strong>{abstimmung?.fuer?.weight || 0}</strong> (
            {formatGermanPercent(abstimmung?.fuer?.weight || 0, totalWeight)} %) | FS:{' '}
            <strong>{abstimmung?.fuer?.fs || 0}</strong>
          </div>
          <div className="bg-white px-2.5 py-1.5 rounded border border-red-200">
            <strong className="text-red-700">NEIN:</strong> Gewichte:{' '}
            <strong>{abstimmung?.gegen?.weight || 0}</strong> (
            {formatGermanPercent(abstimmung?.gegen?.weight || 0, totalWeight)} %) | FS:{' '}
            <strong>{abstimmung?.gegen?.fs || 0}</strong>
          </div>
          <div className="bg-white px-2.5 py-1.5 rounded border border-amber-200">
            <strong className="text-amber-800">ENTHALTUNGEN:</strong> Gewichte:{' '}
            <strong>{abstimmung?.enthaltung?.weight || 0}</strong> (
            {formatGermanPercent(abstimmung?.enthaltung?.weight || 0, totalWeight)} %) | FS:{' '}
            <strong>{abstimmung?.enthaltung?.fs || 0}</strong>
          </div>
        </div>
      </div>

      {modus === 'individuell' ? (
        <div className="space-y-3">
          {/* 1-Klick Bulk-Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 p-2.5 rounded border border-gray-200">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-gray-600 mr-1">Schnell-Vorbelegung:</span>
              <button
                type="button"
                onClick={() => setBulkAnwesend('ja')}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded font-semibold transition"
              >
                Alle {anwesendNrs.size > 0 ? `Anwesenden (${anwesendNrs.size})` : '43 FS'} → Ja
              </button>
              <button
                type="button"
                onClick={() => setBulkAnwesend('nein')}
                className="text-xs bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded font-semibold transition"
              >
                Alle → Nein
              </button>
              <button
                type="button"
                onClick={() => setBulkAnwesend('enthaltung')}
                className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded font-semibold transition"
              >
                Alle → Enthaltung
              </button>
              <button
                type="button"
                onClick={() => setBulkAnwesend(null)}
                className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2.5 py-1 rounded font-medium transition"
              >
                Leeren
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAllFs(!showAllFs)}
                className="text-xs text-emerald-800 hover:underline font-semibold"
              >
                {showAllFs || anwesendNrs.size === 0
                  ? `Alle ${fachschaften.length} FS sichtbar (auf Anwesende beschränken)`
                  : `Nur Anwesende sichtbar (${visibleFachschaften.length}/${fachschaften.length} – Alle zeigen)`}
              </button>
            </div>
          </div>

          {/* Tastatur-Schnelleingabe für Abweichler */}
          <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-2.5 rounded border border-gray-200 text-xs">
            <span className="font-bold text-gray-700">FS-Nummern setzen:</span>
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyQuickBatch(null);
                }
              }}
              placeholder="z.B. 01 09 19 24 40 41 51 oder 06n 24e..."
              className="flex-1 min-w-[200px] border border-gray-300 rounded px-2 py-1 bg-white"
            />
            <button
              type="button"
              onClick={() => applyQuickBatch('ja')}
              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-semibold px-2 py-1 rounded border border-emerald-300"
            >
              → Ja
            </button>
            <button
              type="button"
              onClick={() => applyQuickBatch('nein')}
              className="bg-red-100 hover:bg-red-200 text-red-900 font-semibold px-2 py-1 rounded border border-red-300"
            >
              → Nein
            </button>
            <button
              type="button"
              onClick={() => applyQuickBatch('enthaltung')}
              className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold px-2 py-1 rounded border border-amber-300"
            >
              → Enthaltung
            </button>
            <button
              type="button"
              onClick={() => applyQuickBatch('none')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-2 py-1 rounded"
            >
              → Nicht teilg.
            </button>
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Liste filtern..."
              className="w-32 border border-gray-300 rounded px-2 py-1 bg-white"
            />
          </div>

          {/* Fachschafts-Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-80 overflow-y-auto pr-1">
            {visibleFachschaften.map((fs) => {
              const currentVote = einzelstimmen[fs.nr] || null;
              const isPresent = anwesendNrs.has(fs.nr);
              return (
                <div
                  key={fs.nr}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded border text-xs ${
                    currentVote === 'ja'
                      ? 'bg-emerald-50/80 border-emerald-300'
                      : currentVote === 'nein'
                        ? 'bg-red-50/80 border-red-300'
                        : currentVote === 'enthaltung'
                          ? 'bg-amber-50/80 border-amber-300'
                          : 'bg-white border-gray-200 opacity-75'
                  }`}
                >
                  <div className="truncate flex items-center gap-1.5">
                    <span className="font-mono font-bold text-gray-800">{fs.nr}</span>
                    <span className="font-medium text-gray-800 truncate" title={fs.name}>
                      {fs.name}
                    </span>
                    <span className="text-[11px] text-gray-500 font-semibold shrink-0">
                      ({fs.weight})
                    </span>
                    {!isPresent && anwesendNrs.size > 0 && (
                      <span
                        className="text-[10px] bg-gray-200 text-gray-600 px-1 rounded"
                        title="Nicht in TOP 1 Anwesenheitsliste markiert"
                      >
                        nicht als anw. markiert
                      </span>
                    )}
                  </div>

                  <div className="inline-flex rounded border border-gray-300 overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => setSingleFsVote(fs.nr, 'ja')}
                      className={`px-2 py-0.5 font-semibold ${
                        currentVote === 'ja'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-emerald-50'
                      }`}
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      onClick={() => setSingleFsVote(fs.nr, 'nein')}
                      className={`px-2 py-0.5 font-semibold border-l border-gray-300 ${
                        currentVote === 'nein'
                          ? 'bg-red-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-red-50'
                      }`}
                    >
                      Nein
                    </button>
                    <button
                      type="button"
                      onClick={() => setSingleFsVote(fs.nr, 'enthaltung')}
                      className={`px-2 py-0.5 font-semibold border-l border-gray-300 ${
                        currentVote === 'enthaltung'
                          ? 'bg-amber-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-amber-50'
                      }`}
                    >
                      Enth.
                    </button>
                    <button
                      type="button"
                      onClick={() => setSingleFsVote(fs.nr, null)}
                      title="Nicht an Abstimmung teilgenommen / abwesend"
                      className={`px-2 py-0.5 font-semibold border-l border-gray-300 ${
                        !currentVote
                          ? 'bg-gray-600 text-white'
                          : 'bg-white text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      –
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Manuelle Summeneingabe (Fallback) */
        <div className="grid grid-cols-4 gap-3 text-base text-center pt-2">
          <div></div>
          <div className="font-bold text-gray-600">Dafür</div>
          <div className="font-bold text-gray-600">Dagegen</div>
          <div className="font-bold text-gray-600">Enthaltung</div>

          <div className="text-left font-medium flex items-center">Fachschaften</div>
          <input
            type="number"
            min="0"
            value={abstimmung.fuer.fs}
            onChange={(e) => handleManualChange('fuer', 'fs', e.target.value)}
            className="border rounded p-2 text-center"
          />
          <input
            type="number"
            min="0"
            value={abstimmung.gegen.fs}
            onChange={(e) => handleManualChange('gegen', 'fs', e.target.value)}
            className="border rounded p-2 text-center"
          />
          <input
            type="number"
            min="0"
            value={abstimmung.enthaltung.fs}
            onChange={(e) => handleManualChange('enthaltung', 'fs', e.target.value)}
            className="border rounded p-2 text-center"
          />

          <div className="text-left font-medium flex items-center">Stimmgewichte</div>
          <input
            type="number"
            min="0"
            value={abstimmung.fuer.weight}
            onChange={(e) => handleManualChange('fuer', 'weight', e.target.value)}
            className="border rounded p-2 text-center bg-gray-50"
          />
          <input
            type="number"
            min="0"
            value={abstimmung.gegen.weight}
            onChange={(e) => handleManualChange('gegen', 'weight', e.target.value)}
            className="border rounded p-2 text-center bg-gray-50"
          />
          <input
            type="number"
            min="0"
            value={abstimmung.enthaltung.weight}
            onChange={(e) => handleManualChange('enthaltung', 'weight', e.target.value)}
            className="border rounded p-2 text-center bg-gray-50"
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================

export default function App() {
  // Stammdaten der 43 konstituierten Fachschaften (inkl. Stimmgewichte)
  const [fachschaften, setFachschaften] = usePersistentState(
    'lmu_protokoll_fachschaften_v2',
    DEFAULT_FACHSCHAFTEN
  );
  const [showFsConfig, setShowFsConfig] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Metadaten State
  const [meta, setMeta] = usePersistentState('lmu_protokoll_meta_v2', {
    datum: '',
    beginn: '18:15',
    ende: '',
    redeleitung: '',
    protokoll: '',
    anhang: '',
    raum: 'A120',
    ort: 'Geschwister-Scholl-Platz 1',
    sitzungstitel: ''
  });

  // Tagesordnung & Anträge State
  const [tagesordnung, setTagesordnung] = usePersistentState('lmu_protokoll_to_v2', []);
  const [antraegeRaw, setAntraegeRaw] = usePersistentState('lmu_protokoll_antraege_raw_v2', []);

  // TOP 1 Anwesenheit State
  const [top1Anwesend, setTop1Anwesend] = usePersistentState('lmu_protokoll_anwesend_v2', []);
  const [top1Entschuldigt, setTop1Entschuldigt] = usePersistentState(
    'lmu_protokoll_entschuldigt_v2',
    []
  );
  const [top1Ausgeschlossen, setTop1Ausgeschlossen] = usePersistentState(
    'lmu_protokoll_ausgeschlossen_v2',
    []
  );
  const [sitzungsverlauf, setSitzungsverlauf] = usePersistentState(
    'lmu_protokoll_verlauf_v2',
    []
  );
  const [quickAttendanceInput, setQuickAttendanceInput] = useState('');
  const [autoLogAttendance, setAutoLogAttendance] = useState(false);

  // Abgeleitete Fachschafts-Strukturen
  const fachschaftenLabels = fachschaften.map(formatFsLabel);
  const fachschaftenMap = new Map(fachschaften.map((f) => [f.nr, f]));

  const totalConstitutedWeight = fachschaften.reduce(
    (sum, f) => sum + (Number(f.weight) || 0),
    0
  );
  const anwesendWeight = top1Anwesend.reduce((sum, label) => {
    const nr = extractFsNr(label);
    return sum + (Number(fachschaftenMap.get(nr)?.weight) || 0);
  }, 0);

  // Beschlussfähigkeit: Mehr als die Hälfte der konstituierten (nicht nach § 52 (4) Satz 2 GrundO ausgeschlossenen) FSVen
  const effectiveFsCount = Math.max(1, fachschaften.length - top1Ausgeschlossen.length);
  const quorumThreshold = Math.floor(effectiveFsCount / 2) + 1;
  const isBeschlussfaehig = top1Anwesend.length >= quorumThreshold;

  // Datei-Upload Handler (Tagesordnung CSV, Anträge CSV, Fachschaften CSV, Backup JSON)
  const handleFileUpload = (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;

      if (type === 'json') {
        try {
          const parsed = JSON.parse(content);
          if (parsed.fachschaften) setFachschaften(parsed.fachschaften);
          if (parsed.meta) setMeta((prev) => ({ ...prev, ...parsed.meta }));
          if (Array.isArray(parsed.tagesordnung)) setTagesordnung(parsed.tagesordnung);
          if (Array.isArray(parsed.top1Anwesend)) setTop1Anwesend(parsed.top1Anwesend);
          if (Array.isArray(parsed.top1Entschuldigt)) setTop1Entschuldigt(parsed.top1Entschuldigt);
          if (Array.isArray(parsed.top1Ausgeschlossen)) {
            setTop1Ausgeschlossen(parsed.top1Ausgeschlossen);
          }
          if (Array.isArray(parsed.sitzungsverlauf)) setSitzungsverlauf(parsed.sitzungsverlauf);
        } catch (err) {
          alert('Fehler beim Laden der Backup-Datei: ' + err.message);
        }
        return;
      }

      const data = parseCSV(content);

      if (type === 'fachschaften') {
        const parsedFs = data
          .map((row) => {
            const nr = String(row['FS-Nr.'] || row.nr || row.Nummer || '')
              .trim()
              .padStart(2, '0');
            const name = String(row.Fachschaft || row.name || row.Name || '').trim();
            const weight =
              Number(row.vote_weight || row.Stimmgewicht || row.weight || 0) || 0;
            return { nr, name, weight };
          })
          .filter((f) => f.nr && f.name);

        if (parsedFs.length > 0) {
          setFachschaften(parsedFs);
        }
        return;
      }

      if (type === 'tagesordnung') {
        const enrichedData = data
          .filter((row) => (row.agenda_type || '').trim().toLowerCase() !== 'internal')
          .map((row) => ({
            ...row,
            item_number: (row.item_number || row.TOP || row.Nummer || '')
              .replace(/\.0$/, '')
              .trim(),
            title: (row.title || row.Titel || '').trim(),
            text: row.text || row.Text || '',
            slug: slugify(
              (row.item_number || row.TOP || '') + '-' + (row.title || row.Titel || '')
            ),
            vertagt: false,
            uhrzeit: '',
            goAntraege: [],
            wahlen: [],
            antraege: [],
            showSitzungsverlauf: false,
            sitzungsverlaufText: ''
          }));
        setTagesordnung(enrichedData);
      } else if (type === 'antraege') {
        setAntraegeRaw(data);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Mappe Anträge aus CSV auf Tagesordnungspunkte
  useEffect(() => {
    if (tagesordnung.length > 0 && antraegeRaw.length > 0) {
      setTagesordnung((prevTo) => {
        let changed = false;
        const nextTo = prevTo.map((top) => {
          const matchingAntraege = antraegeRaw
            .filter(
              (a) =>
                (a.Titel || '').trim() === top.title ||
                (a.TOP && String(a.TOP).trim() === String(top.item_number).trim()) ||
                (a.item_number &&
                  String(a.item_number).trim() === String(top.item_number).trim())
            )
            .map((a) => {
              const existing = top.antraege?.find(
                (ex) => ex.Bezeichner === (a.Bezeichner || '') && ex.Titel === (a.Titel || '')
              );
              return {
                ...a,
                Bezeichner: a.Bezeichner || a.Titel || '',
                Antragsteller: a['Antragsteller*in'] || a.Antragsteller || '',
                Status: existing?.Status || a.Status || '',
                Text: a.Text || '',
                Begründung: a.Begründung || a.Begruendung || '',
                abstimmung: existing ? existing.abstimmung : null
              };
            });

          if (
            matchingAntraege.length > 0 &&
            JSON.stringify(top.antraege) !== JSON.stringify(matchingAntraege) &&
            (!top.antraege || top.antraege.length === 0)
          ) {
            changed = true;
            return { ...top, antraege: matchingAntraege };
          }
          return top;
        });
        return changed ? nextTo : prevTo;
      });
    }
  }, [antraegeRaw, tagesordnung.length, setTagesordnung]);

  // JSON Backup Export
  const handleExportJSON = () => {
    const payload = {
      version: '2.1',
      exportedAt: new Date().toISOString(),
      meta,
      fachschaften,
      top1Anwesend,
      top1Entschuldigt,
      top1Ausgeschlossen,
      sitzungsverlauf,
      tagesordnung
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `protokoll-${meta.datum || 'konvent'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (
      window.confirm(
        'Möchtest du wirklich alle eingegebenen Sitzungsdaten zurücksetzen?'
      )
    ) {
      localStorage.removeItem('lmu_protokoll_meta_v2');
      localStorage.removeItem('lmu_protokoll_to_v2');
      localStorage.removeItem('lmu_protokoll_antraege_raw_v2');
      localStorage.removeItem('lmu_protokoll_anwesend_v2');
      localStorage.removeItem('lmu_protokoll_entschuldigt_v2');
      localStorage.removeItem('lmu_protokoll_ausgeschlossen_v2');
      localStorage.removeItem('lmu_protokoll_verlauf_v2');
      window.location.reload();
    }
  };

  // Präsenz-Änderungen (mit optionalem Auto-Log im Sitzungsverlauf)
  const handleAnwesendChange = (nextAnwesend) => {
    const added = nextAnwesend.filter((x) => !top1Anwesend.includes(x));
    const removed = top1Anwesend.filter((x) => !nextAnwesend.includes(x));

    setTop1Anwesend(nextAnwesend);
    setTop1Entschuldigt((prev) => prev.filter((x) => !nextAnwesend.includes(x)));
    setTop1Ausgeschlossen((prev) => prev.filter((x) => !nextAnwesend.includes(x)));

    if (autoLogAttendance && (added.length > 0 || removed.length > 0)) {
      const nowTime = new Date().toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const newLogs = [
        ...added.map((fs) => ({
          uhrzeit: nowTime,
          vermerk: `FS ${fs} trifft ein (${nextAnwesend.length} FS anwesend).`
        })),
        ...removed.map((fs) => ({
          uhrzeit: nowTime,
          vermerk: `FS ${fs} verlässt die Sitzung (${nextAnwesend.length} FS anwesend).`
        }))
      ];
      setSitzungsverlauf((prev) => [...prev, ...newLogs]);
    }
  };

  const handleQuickAttendanceToggle = (e) => {
    e.preventDefault();
    const raw = quickAttendanceInput.trim();
    if (!raw) return;

    const tokens = raw.split(/[\s,;]+/).filter(Boolean);
    let current = [...top1Anwesend];

    for (const token of tokens) {
      const padded = token.padStart(2, '0').toLowerCase();
      const found = fachschaftenLabels.find(
        (label) =>
          label.toLowerCase().startsWith(padded) ||
          label.toLowerCase().includes(token.toLowerCase())
      );
      if (found) {
        if (current.includes(found)) {
          current = current.filter((item) => item !== found);
        } else {
          current.push(found);
        }
      }
    }

    current.sort((a, b) => a.localeCompare(b, 'de'));
    handleAnwesendChange(current);
    setQuickAttendanceInput('');
  };

  // --- UI Handler für TOP Modifikationen ---
  const updateTop = (index, field, value) => {
    const newTo = [...tagesordnung];
    newTo[index] = { ...newTo[index], [field]: value };
    setTagesordnung(newTo);
  };

  const addManualTop = () => {
    const nextNum = String(tagesordnung.length + 1);
    setTagesordnung([
      ...tagesordnung,
      {
        item_number: nextNum,
        title: 'Neuer Tagesordnungspunkt',
        text: '',
        slug: slugify(`${nextNum}-neuer-tagesordnungspunkt`),
        vertagt: false,
        uhrzeit: '',
        goAntraege: [],
        wahlen: [],
        antraege: [],
        showSitzungsverlauf: false,
        sitzungsverlaufText: ''
      }
    ]);
  };

  const toggleSitzungsverlauf = (topIndex) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].showSitzungsverlauf = !newTo[topIndex].showSitzungsverlauf;
    setTagesordnung(newTo);
  };

  const updateSitzungsverlaufText = (topIndex, text) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].sitzungsverlaufText = text;
    setTagesordnung(newTo);
  };

  // Anträge innerhalb eines TOPs
  const addManualAntrag = (topIndex) => {
    const newTo = [...tagesordnung];
    const top = newTo[topIndex];
    top.antraege = [
      ...(top.antraege || []),
      {
        Bezeichner: top.title,
        Antragsteller: '',
        Status: 'angenommen',
        Text: '',
        Begründung: '',
        abstimmung: createInitialAbstimmung(top1Anwesend, fachschaften, 'ja')
      }
    ];
    setTagesordnung(newTo);
  };

  const updateAntragField = (topIndex, antragIndex, field, value) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].antraege[antragIndex] = {
      ...newTo[topIndex].antraege[antragIndex],
      [field]: value
    };
    setTagesordnung(newTo);
  };

  const removeAntrag = (topIndex, antragIndex) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].antraege.splice(antragIndex, 1);
    setTagesordnung(newTo);
  };

  const initAbstimmung = (topIndex, antragIndex) => {
    const newTo = [...tagesordnung];
    const initialVote = createInitialAbstimmung(top1Anwesend, fachschaften, 'ja');
    newTo[topIndex].antraege[antragIndex].abstimmung = initialVote;
    if (initialVote.fuer.weight > 0) {
      newTo[topIndex].antraege[antragIndex].Status = 'angenommen';
    }
    setTagesordnung(newTo);
  };

  const setAntragAbstimmung = (topIndex, antragIndex, nextAbstimmung) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].antraege[antragIndex].abstimmung = nextAbstimmung;
    setTagesordnung(newTo);
  };

  // GO-Anträge
  const addGOAntrag = (topIndex) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].goAntraege.push({
      einreichend: '',
      uhrzeit: '',
      antrag: '',
      gegenrede: '',
      ergebnis: 'angenommen',
      abstimmung: null
    });
    setTagesordnung(newTo);
  };

  const updateGOAntrag = (topIndex, goIndex, field, value) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].goAntraege[goIndex][field] = value;
    setTagesordnung(newTo);
  };

  const removeGOAntrag = (topIndex, goIndex) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].goAntraege.splice(goIndex, 1);
    setTagesordnung(newTo);
  };

  const initGOAbstimmung = (topIndex, goIndex) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].goAntraege[goIndex].abstimmung = createInitialAbstimmung(
      top1Anwesend,
      fachschaften,
      'ja'
    );
    setTagesordnung(newTo);
  };

  // Wahlen & Abstimmungen (ohne Antrag)
  const addWahl = (topIndex) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].wahlen = newTo[topIndex].wahlen || [];
    newTo[topIndex].wahlen.push({
      titel: '',
      kandidaten: [
        {
          name: '',
          fuer: { fs: 0, weight: 0 },
          gegen: { fs: 0, weight: 0 },
          enthaltung: { fs: 0, weight: 0 }
        }
      ]
    });
    setTagesordnung(newTo);
  };

  const updateWahlTitel = (topIndex, wahlIndex, value) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].wahlen[wahlIndex].titel = value;
    setTagesordnung(newTo);
  };

  const removeWahl = (topIndex, wahlIndex) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].wahlen.splice(wahlIndex, 1);
    setTagesordnung(newTo);
  };

  const addKandidat = (topIndex, wahlIndex) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].wahlen[wahlIndex].kandidaten.push({
      name: '',
      fuer: { fs: 0, weight: 0 },
      gegen: { fs: 0, weight: 0 },
      enthaltung: { fs: 0, weight: 0 }
    });
    setTagesordnung(newTo);
  };

  const updateKandidat = (topIndex, wahlIndex, kandIndex, type, subfield, value) => {
    const newTo = [...tagesordnung];
    if (type === 'name') {
      newTo[topIndex].wahlen[wahlIndex].kandidaten[kandIndex].name = value;
    } else {
      newTo[topIndex].wahlen[wahlIndex].kandidaten[kandIndex][type][subfield] =
        Number(value) || 0;
    }
    setTagesordnung(newTo);
  };

  const removeKandidat = (topIndex, wahlIndex, kandIndex) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].wahlen[wahlIndex].kandidaten.splice(kandIndex, 1);
    setTagesordnung(newTo);
  };

  const addSitzungsverlauf = () => {
    setSitzungsverlauf([...sitzungsverlauf, { uhrzeit: '', vermerk: '' }]);
  };

  // --- Druck- & Formatierungs-Hilfsfunktionen ---
  const handlePrint = () => {
    window.print();
  };

  const formattedPrintDate = () => {
    if (!meta.datum) return '';
    try {
      const dateParts = meta.datum.split('-');
      if (dateParts.length === 3) {
        return `${dateParts[2]}.${dateParts[1]}.${dateParts[0].substring(2)}`;
      }
      return meta.datum;
    } catch {
      return meta.datum;
    }
  };

  const formattedPrintDateLong = () => {
    if (!meta.datum) return '';
    try {
      const dateParts = meta.datum.split('-');
      if (dateParts.length === 3) {
        return `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;
      }
      return meta.datum;
    } catch {
      return meta.datum;
    }
  };

  const isHauptTop = (item_number) => {
    return item_number && !item_number.toString().includes('.');
  };

  // Sammle alle Abstimmungen mit individuellem Abstimmungsverhalten nach § 7 (7) GO KF für den Anhang am Dokumentende
  const anhangAbstimmungen = [];
  tagesordnung.forEach((row) => {
    if (row.vertagt) return;
    const topNumStr = String(row.item_number || '').trim();

    if (Array.isArray(row.antraege)) {
      row.antraege.forEach((antrag, aIdx) => {
        const abst = antrag.abstimmung;
        if (
          abst &&
          abst.modus === 'individuell' &&
          abst.imAnhang !== false &&
          abst.einzelstimmen &&
          Object.keys(abst.einzelstimmen).length > 0
        ) {
          const calc = computeFromEinzelstimmen(abst.einzelstimmen, fachschaften);
          if (calc.details.length > 0) {
            const labelTitle =
              antrag.Bezeichner && antrag.Bezeichner !== row.title
                ? `${row.title} (${antrag.Bezeichner})`
                : row.title || antrag.Bezeichner;
            anhangAbstimmungen.push({
              id: `top-${topNumStr}-antrag-${aIdx}`,
              heading: `TOP ${topNumStr}: ${labelTitle}`,
              antragsteller: antrag.Antragsteller || '',
              status: antrag.Status || calc.suggestedStatus || '—',
              ...calc
            });
          }
        }
      });
    }

    if (Array.isArray(row.goAntraege)) {
      row.goAntraege.forEach((go, gIdx) => {
        const abst = go.abstimmung;
        if (
          abst &&
          abst.modus === 'individuell' &&
          abst.imAnhang !== false &&
          abst.einzelstimmen &&
          Object.keys(abst.einzelstimmen).length > 0
        ) {
          const calc = computeFromEinzelstimmen(abst.einzelstimmen, fachschaften);
          if (calc.details.length > 0) {
            anhangAbstimmungen.push({
              id: `top-${topNumStr}-go-${gIdx}`,
              heading: `GO-Antrag: ${go.antrag || `Zu TOP ${topNumStr}`}`,
              antragsteller: go.einreichend || '',
              status: go.ergebnis || calc.suggestedStatus || '—',
              ...calc
            });
          }
        }
      });
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white font-sans text-gray-800">
      {/* ------------------------------------------------------------- */}
      {/* EDITOR ANSICHT (Wird beim Drucken versteckt via 'print:hidden') */}
      {/* ------------------------------------------------------------- */}
      <div className="print:hidden max-w-5xl mx-auto p-6 space-y-8">
        {/* Top Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 bg-emerald-800 text-white p-6 rounded-xl shadow-lg">
          <div>
            <h1 className="text-3xl font-bold">Protokoll Generator</h1>
            <p className="text-emerald-100 mt-1 text-lg">
              Konvent der Fachschaften, LMU München
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPrintPreview(!showPrintPreview)}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold border border-emerald-500 transition"
            >
              {showPrintPreview ? <EyeOff size={18} /> : <Eye size={18} />}
              {showPrintPreview ? 'Vorschau schließen' : 'Druckvorschau'}
            </button>
            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold border border-emerald-500 transition"
              title="Zwischenstand als JSON speichern"
            >
              <Download size={18} /> Backup (.json)
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 bg-red-700 hover:bg-red-600 text-white px-3 py-2.5 rounded-lg text-sm font-semibold transition"
              title="Alle Sitzungsdaten zurücksetzen"
            >
              <RotateCcw size={18} />
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white text-emerald-800 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition shadow"
            >
              <Printer size={20} /> Protokoll exportieren (PDF)
            </button>
          </div>
        </div>

        {/* --- SCHRITT 1: METADATEN & UPLOAD --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
              <FileText size={24} /> 1. Rahmendaten & Dateien
            </h2>
            <button
              type="button"
              onClick={() => setShowFsConfig(!showFsConfig)}
              className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5"
            >
              <Settings size={15} />
              Stimmgewichte der {fachschaften.length} Fachschaften (Gesamt: {totalConstitutedWeight})
            </button>
          </div>

          {/* Optionales Konfigurations-Panel für die 43 Fachschaften & Stimmgewichte */}
          {showFsConfig && (
            <div className="mb-6 p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">
                    Konstituierte Fachschaftsvertretungen ({fachschaften.length} FSVen | Summe Stimmgewichte: {totalConstitutedWeight})
                  </h3>
                  <p className="text-xs text-gray-600">
                    Standardmäßig sind die 43 konstituierten FSVen der aktuellen Legislaturperiode hinterlegt. Änderungen werden automatisch im Browser gespeichert.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer text-xs bg-white border border-emerald-300 text-emerald-800 px-2.5 py-1 rounded font-semibold hover:bg-emerald-100">
                    CSV importieren (FS-Nr.;Fachschaft;vote_weight)
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileUpload(e, 'fachschaften')}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setFachschaften(DEFAULT_FACHSCHAFTEN)}
                    className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2.5 py-1 rounded font-medium"
                  >
                    Standard (43 FSVen) wiederherstellen
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                {fachschaften.map((fs, idx) => (
                  <div
                    key={fs.nr}
                    className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded border border-gray-200 text-xs"
                  >
                    <span className="truncate font-medium">
                      <strong>{fs.nr}</strong> {fs.name}
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={fs.weight}
                      onChange={(e) => {
                        const next = [...fachschaften];
                        next[idx] = { ...fs, weight: Math.max(1, Number(e.target.value) || 1) };
                        setFachschaften(next);
                      }}
                      className="w-14 border border-gray-300 rounded px-1.5 py-0.5 text-center font-bold"
                      title="Stimmgewicht"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Datum der Sitzung
              </label>
              <input
                type="date"
                value={meta.datum}
                onChange={(e) => setMeta({ ...meta, datum: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beginn (Uhrzeit)
              </label>
              <input
                type="time"
                value={meta.beginn}
                onChange={(e) => setMeta({ ...meta, beginn: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ende (Uhrzeit)
              </label>
              <input
                type="time"
                value={meta.ende}
                onChange={(e) => setMeta({ ...meta, ende: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Redeleitung
              </label>
              <input
                type="text"
                value={meta.redeleitung}
                onChange={(e) => setMeta({ ...meta, redeleitung: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border text-base"
                placeholder="Name 1, Name 2..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Protokollführung
              </label>
              <input
                type="text"
                value={meta.protokoll}
                onChange={(e) => setMeta({ ...meta, protokoll: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border text-base"
                placeholder="Name..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anhang (Optional)
              </label>
              <input
                type="text"
                value={meta.anhang}
                onChange={(e) => setMeta({ ...meta, anhang: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border text-base"
                placeholder="z.B. Anhang 1: Abstimmungsübersicht"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Raum
              </label>
              <input
                type="text"
                value={meta.raum}
                onChange={(e) => setMeta({ ...meta, raum: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border text-base"
                placeholder="z.B. A120 oder F007"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ort / Adresse
              </label>
              <input
                type="text"
                value={meta.ort}
                onChange={(e) => setMeta({ ...meta, ort: e.target.value })}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border text-base"
                placeholder="z.B. Geschwister-Scholl-Platz 1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">
                Tagesordnung (.csv)
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'tagesordnung')}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
            </div>
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">
                Anträge (.csv){' '}
                <span className="font-normal text-gray-500">(Optional)</span>
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'antraege')}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
            </div>
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">
                Backup laden (.json){' '}
                <span className="font-normal text-gray-500">(Optional)</span>
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => handleFileUpload(e, 'json')}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
              />
            </div>
          </div>
        </div>

        {/* --- SCHRITT 2: TOP 1 ANWESENHEIT --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-200 border-l-4 border-l-emerald-600">
          <h2 className="text-xl font-bold text-emerald-800 mb-4">
            Anwesenheitsmatrix & Beschlussfähigkeit (Formalia)
          </h2>

          <div className="space-y-6">
            {/* Schnell-Aufruf per FS-Nr. */}
            <form
              onSubmit={handleQuickAttendanceToggle}
              className="flex flex-wrap items-center gap-3 bg-emerald-50/70 p-3 rounded-lg border border-emerald-200"
            >
              <label className="text-sm font-bold text-emerald-900">
                Schnell-Eingabe Anwesenheit (FS-Nr.):
              </label>
              <input
                type="text"
                value={quickAttendanceInput}
                onChange={(e) => setQuickAttendanceInput(e.target.value)}
                placeholder="z.B. 01 03 04 05 06 08..."
                className="flex-1 min-w-[200px] border border-emerald-300 rounded px-3 py-1.5 text-sm bg-white"
              />
              <button
                type="submit"
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-3 py-1.5 rounded transition"
              >
                Umschalten
              </button>
              <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer ml-auto">
                <input
                  type="checkbox"
                  checked={autoLogAttendance}
                  onChange={(e) => setAutoLogAttendance(e.target.checked)}
                  className="accent-emerald-700 w-4 h-4"
                />
                Untertägige Änderungen automatisch im Sitzungsverlauf vermerken
              </label>
            </form>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Anwesende Fachschaften
              </label>
              <MultiSelect
                options={fachschaftenLabels}
                selected={top1Anwesend}
                onChange={handleAnwesendChange}
                placeholder="Fachschaften auswählen..."
                fachschaftenMap={fachschaftenMap}
              />
              <div className="mt-2 text-base flex flex-wrap gap-4">
                <span>
                  Anwesende Fachschaften:{' '}
                  <span className="font-bold">
                    {top1Anwesend.length} / {fachschaften.length}
                  </span>
                </span>
                <span>
                  Anwesendes Stimmgewicht:{' '}
                  <span className="font-bold">
                    {anwesendWeight} / {totalConstitutedWeight}
                  </span>
                </span>
                <span>
                  Beschlussfähig (&ge; {quorumThreshold}):{' '}
                  <span
                    className={`font-bold ${
                      isBeschlussfaehig ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {isBeschlussfaehig ? 'Ja' : 'Nein'}
                  </span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Entschuldigte Fachschaften
                </label>
                <MultiSelect
                  options={fachschaftenLabels.filter((f) => !top1Anwesend.includes(f))}
                  selected={top1Entschuldigt}
                  onChange={setTop1Entschuldigt}
                  placeholder="Wählen..."
                  fachschaftenMap={fachschaftenMap}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Ausgeschlossen (§ 52 (4) Satz 2 GrundO)
                </label>
                <MultiSelect
                  options={fachschaftenLabels.filter(
                    (f) => !top1Anwesend.includes(f) && !top1Entschuldigt.includes(f)
                  )}
                  selected={top1Ausgeschlossen}
                  onChange={setTop1Ausgeschlossen}
                  placeholder="Wählen..."
                  fachschaftenMap={fachschaftenMap}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-base font-bold text-gray-700">
                  Chronologischer Sitzungsverlauf (Mutationen)
                </label>
                <button
                  type="button"
                  onClick={addSitzungsverlauf}
                  className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded flex items-center gap-1"
                >
                  <Plus size={16} /> Eintrag
                </button>
              </div>
              {sitzungsverlauf.map((v, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <input
                    type="time"
                    value={v.uhrzeit}
                    onChange={(e) => {
                      const newV = [...sitzungsverlauf];
                      newV[i].uhrzeit = e.target.value;
                      setSitzungsverlauf(newV);
                    }}
                    className="w-32 border border-gray-300 p-2 rounded text-base"
                  />
                  <input
                    type="text"
                    value={v.vermerk}
                    onChange={(e) => {
                      const newV = [...sitzungsverlauf];
                      newV[i].vermerk = e.target.value;
                      setSitzungsverlauf(newV);
                    }}
                    className="flex-1 border border-gray-300 p-2 rounded text-base"
                    placeholder="z.B. FS 04 kommt nach."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newV = [...sitzungsverlauf];
                      newV.splice(i, 1);
                      setSitzungsverlauf(newV);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- SCHRITT 3: DYNAMISCHE TAGESORDNUNG --- */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b-2 border-gray-200 pb-2">
            <h2 className="text-2xl font-bold text-gray-800">
              Tagesordnungspunkte
            </h2>
            <button
              type="button"
              onClick={addManualTop}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-lg text-sm font-bold transition"
            >
              <Plus size={16} /> TOP manuell hinzufügen
            </button>
          </div>

          {tagesordnung.length === 0 && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center text-gray-500">
              Lade oben eine <strong>Tagesordnung (.csv)</strong> hoch oder klicke auf{' '}
              <strong>„+ TOP manuell hinzufügen“</strong>, um mit der Protokollierung zu starten.
            </div>
          )}

          {tagesordnung.map((top, index) => (
            <div
              key={index}
              className={`bg-white rounded-xl shadow-sm border ${
                top.vertagt ? 'border-orange-300 opacity-75' : 'border-gray-200'
              } overflow-hidden`}
            >
              {/* TOP Header */}
              <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={top.item_number}
                    onChange={(e) => updateTop(index, 'item_number', e.target.value)}
                    className="w-16 font-bold text-lg text-gray-800 bg-white border border-gray-300 rounded px-2 py-1 text-center"
                    title="TOP-Nummer"
                  />
                  <input
                    type="text"
                    value={top.title}
                    onChange={(e) => updateTop(index, 'title', e.target.value)}
                    className="flex-1 font-bold text-lg text-gray-800 bg-white border border-gray-300 rounded px-2.5 py-1"
                    title="TOP-Titel"
                  />
                </div>

                <div className="flex items-center gap-4 text-base">
                  {isHauptTop(top.item_number) && (
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-gray-300">
                      <Clock size={18} className="text-gray-500" />
                      <input
                        type="time"
                        value={top.uhrzeit}
                        onChange={(e) => updateTop(index, 'uhrzeit', e.target.value)}
                        className="outline-none bg-transparent"
                      />
                    </div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer bg-orange-50 px-4 py-2 rounded-full border border-orange-200 text-orange-800 font-medium hover:bg-orange-100">
                    <input
                      type="checkbox"
                      checked={top.vertagt}
                      onChange={(e) => updateTop(index, 'vertagt', e.target.checked)}
                      className="accent-orange-600 w-5 h-5"
                    />
                    Vertagt
                  </label>
                </div>
              </div>

              {/* TOP Content (Versteckt, wenn vertagt) */}
              {!top.vertagt && (
                <div className="p-4 space-y-6">
                  {/* Sitzungsverlauf / Protokoll pro TOP */}
                  {top.showSitzungsverlauf && (
                    <div className="bg-purple-50 border-l-4 border-purple-500 p-5 rounded-r-lg relative">
                      <button
                        type="button"
                        onClick={() => toggleSitzungsverlauf(index)}
                        className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={20} />
                      </button>
                      <h4 className="font-bold text-purple-800 mb-3 text-base uppercase">
                        Sitzungsverlauf / Protokoll
                      </h4>
                      <textarea
                        value={top.sitzungsverlaufText}
                        onChange={(e) => updateSitzungsverlaufText(index, e.target.value)}
                        className="w-full border border-purple-200 rounded p-3 text-base min-h-[150px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Hier den Diskussionsverlauf, Wortmeldungen und inhaltliche Anmerkungen eintragen..."
                      />
                    </div>
                  )}

                  {/* Zugehörige Anträge */}
                  {top.antraege && top.antraege.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-emerald-800 text-lg border-b border-emerald-100 pb-1">
                        Zugehörige Anträge
                      </h4>
                      {top.antraege.map((antrag, aIndex) => (
                        <div
                          key={aIndex}
                          className="bg-emerald-50 border-l-4 border-emerald-600 p-5 rounded-r-lg relative"
                        >
                          <button
                            type="button"
                            onClick={() => removeAntrag(index, aIndex)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
                            title="Antrag entfernen"
                          >
                            <Trash2 size={18} />
                          </button>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-800 mb-3 border-b border-emerald-200 pb-3 pr-6">
                            <div>
                              <label className="block text-xs font-bold text-emerald-900 uppercase">
                                Antrag / Bezeichner
                              </label>
                              <input
                                type="text"
                                value={antrag.Bezeichner || ''}
                                onChange={(e) =>
                                  updateAntragField(index, aIndex, 'Bezeichner', e.target.value)
                                }
                                className="w-full border border-emerald-300 rounded px-2 py-1 mt-0.5 bg-white font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-emerald-900 uppercase">
                                Antragsteller*in
                              </label>
                              <input
                                type="text"
                                value={antrag.Antragsteller || ''}
                                onChange={(e) =>
                                  updateAntragField(index, aIndex, 'Antragsteller', e.target.value)
                                }
                                className="w-full border border-emerald-300 rounded px-2 py-1 mt-0.5 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-emerald-900 uppercase">
                                Status
                              </label>
                              <input
                                type="text"
                                value={antrag.Status || ''}
                                onChange={(e) =>
                                  updateAntragField(index, aIndex, 'Status', e.target.value)
                                }
                                placeholder="z.B. angenommen / abgelehnt"
                                className="w-full border border-emerald-300 rounded px-2 py-1 mt-0.5 bg-white font-semibold"
                              />
                            </div>
                          </div>

                          {antrag.Text !== undefined && (
                            <div className="mb-3">
                              <strong className="text-sm text-emerald-700 uppercase">
                                Antragstext / Beschlussfassung
                              </strong>
                              <textarea
                                value={antrag.Text || ''}
                                onChange={(e) =>
                                  updateAntragField(index, aIndex, 'Text', e.target.value)
                                }
                                rows={3}
                                placeholder="Antragstext oder Beschlussfassung..."
                                className="w-full border border-emerald-200 rounded p-2 text-sm mt-1 bg-white"
                              />
                            </div>
                          )}

                          {antrag.Begründung && (
                            <div className="mb-4">
                              <strong className="text-sm text-emerald-700 uppercase">
                                Begründung
                              </strong>
                              <div
                                className="text-base mt-1 text-gray-700"
                                dangerouslySetInnerHTML={{
                                  __html: sanitizeRichText(antrag.Begründung)
                                }}
                              />
                            </div>
                          )}

                          {/* Abstimmungs-Editor */}
                          {!antrag.abstimmung ? (
                            <button
                              type="button"
                              onClick={() => initAbstimmung(index, aIndex)}
                              className="mt-3 text-base bg-white border border-emerald-300 text-emerald-700 px-4 py-2 rounded hover:bg-emerald-100 font-medium"
                            >
                              + Abstimmungsergebnis erfassen (§ 7 Abs. 7 GO)
                            </button>
                          ) : (
                            <AbstimmungsEditor
                              abstimmung={antrag.abstimmung}
                              status={antrag.Status}
                              onChangeAbstimmung={(nextAbst) =>
                                setAntragAbstimmung(index, aIndex, nextAbst)
                              }
                              onChangeStatus={(nextStatus) =>
                                updateAntragField(index, aIndex, 'Status', nextStatus)
                              }
                              onRemoveAbstimmung={() =>
                                setAntragAbstimmung(index, aIndex, null)
                              }
                              fachschaften={fachschaften}
                              anwesendLabels={top1Anwesend}
                              accentColor="emerald"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Wahlen & Abstimmungen (ohne Antrag) */}
                  {top.wahlen && top.wahlen.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-blue-800 text-lg border-b border-blue-200 pb-1">
                        Wahlen & Abstimmungen (ohne Antrag)
                      </h4>
                      {top.wahlen.map((wahl, wIndex) => (
                        <div
                          key={wIndex}
                          className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-lg relative"
                        >
                          <button
                            type="button"
                            onClick={() => removeWahl(index, wIndex)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={20} />
                          </button>
                          <div className="mb-4">
                            <label className="block text-sm font-bold text-blue-700 uppercase mb-1">
                              Titel der Wahl
                            </label>
                            <input
                              type="text"
                              value={wahl.titel}
                              onChange={(e) =>
                                updateWahlTitel(index, wIndex, e.target.value)
                              }
                              className="w-full border-gray-300 rounded p-2 text-base"
                              placeholder="z.B. Wahl der Versammlungsleitung"
                            />
                          </div>
                          <table className="w-full text-base text-left mb-3">
                            <thead className="text-sm text-gray-600 bg-blue-100">
                              <tr>
                                <th className="p-2 rounded-tl">Kandidat*in / Option</th>
                                <th className="p-2 text-center">Für (FS/Gew)</th>
                                <th className="p-2 text-center">Gegen (FS/Gew)</th>
                                <th className="p-2 text-center">Enth. (FS/Gew)</th>
                                <th className="p-2 rounded-tr"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {wahl.kandidaten.map((kand, kIndex) => (
                                <tr
                                  key={kIndex}
                                  className="border-b border-blue-100 last:border-0"
                                >
                                  <td className="p-1">
                                    <input
                                      type="text"
                                      value={kand.name}
                                      onChange={(e) =>
                                        updateKandidat(
                                          index,
                                          wIndex,
                                          kIndex,
                                          'name',
                                          null,
                                          e.target.value
                                        )
                                      }
                                      className="w-full border-gray-300 rounded p-2"
                                      placeholder="Name..."
                                    />
                                  </td>
                                  <td className="p-1">
                                    <div className="flex gap-1 justify-center">
                                      <input
                                        type="number"
                                        min="0"
                                        value={kand.fuer.fs}
                                        onChange={(e) =>
                                          updateKandidat(
                                            index,
                                            wIndex,
                                            kIndex,
                                            'fuer',
                                            'fs',
                                            e.target.value
                                          )
                                        }
                                        className="w-14 border-gray-300 rounded p-2 text-center"
                                        title="Fachschaften"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        value={kand.fuer.weight}
                                        onChange={(e) =>
                                          updateKandidat(
                                            index,
                                            wIndex,
                                            kIndex,
                                            'fuer',
                                            'weight',
                                            e.target.value
                                          )
                                        }
                                        className="w-16 border-gray-300 rounded p-2 text-center bg-gray-50"
                                        title="Stimmgewichte"
                                      />
                                    </div>
                                  </td>
                                  <td className="p-1">
                                    <div className="flex gap-1 justify-center">
                                      <input
                                        type="number"
                                        min="0"
                                        value={kand.gegen.fs}
                                        onChange={(e) =>
                                          updateKandidat(
                                            index,
                                            wIndex,
                                            kIndex,
                                            'gegen',
                                            'fs',
                                            e.target.value
                                          )
                                        }
                                        className="w-14 border-gray-300 rounded p-2 text-center"
                                        title="Fachschaften"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        value={kand.gegen.weight}
                                        onChange={(e) =>
                                          updateKandidat(
                                            index,
                                            wIndex,
                                            kIndex,
                                            'gegen',
                                            'weight',
                                            e.target.value
                                          )
                                        }
                                        className="w-16 border-gray-300 rounded p-2 text-center bg-gray-50"
                                        title="Stimmgewichte"
                                      />
                                    </div>
                                  </td>
                                  <td className="p-1">
                                    <div className="flex gap-1 justify-center">
                                      <input
                                        type="number"
                                        min="0"
                                        value={kand.enthaltung.fs}
                                        onChange={(e) =>
                                          updateKandidat(
                                            index,
                                            wIndex,
                                            kIndex,
                                            'enthaltung',
                                            'fs',
                                            e.target.value
                                          )
                                        }
                                        className="w-14 border-gray-300 rounded p-2 text-center"
                                        title="Fachschaften"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        value={kand.enthaltung.weight}
                                        onChange={(e) =>
                                          updateKandidat(
                                            index,
                                            wIndex,
                                            kIndex,
                                            'enthaltung',
                                            'weight',
                                            e.target.value
                                          )
                                        }
                                        className="w-16 border-gray-300 rounded p-2 text-center bg-gray-50"
                                        title="Stimmgewichte"
                                      />
                                    </div>
                                  </td>
                                  <td className="p-1 text-center">
                                    <button
                                      type="button"
                                      onClick={() => removeKandidat(index, wIndex, kIndex)}
                                      className="text-red-400 hover:text-red-600"
                                    >
                                      <Trash2 size={20} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <button
                            type="button"
                            onClick={() => addKandidat(index, wIndex)}
                            className="text-sm font-medium bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-100"
                          >
                            + Kandidat*in / Option hinzufügen
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* GO Anträge */}
                  <div className="space-y-4">
                    {top.goAntraege.map((go, goIndex) => (
                      <div
                        key={goIndex}
                        className="bg-orange-50 border-l-4 border-orange-500 p-5 rounded-r-lg relative"
                      >
                        <button
                          type="button"
                          onClick={() => removeGOAntrag(index, goIndex)}
                          className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={20} />
                        </button>
                        <h4 className="font-bold text-orange-800 mb-3 text-base uppercase">
                          GO-Antrag
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
                          <div>
                            <label className="block text-xs text-gray-500 uppercase font-bold">
                              Einreichend
                            </label>
                            <input
                              type="text"
                              value={go.einreichend}
                              onChange={(e) =>
                                updateGOAntrag(index, goIndex, 'einreichend', e.target.value)
                              }
                              className="w-full border-gray-300 rounded p-2 mt-1 bg-white border"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 uppercase font-bold">
                              Uhrzeit
                            </label>
                            <input
                              type="time"
                              value={go.uhrzeit}
                              onChange={(e) =>
                                updateGOAntrag(index, goIndex, 'uhrzeit', e.target.value)
                              }
                              className="w-full border-gray-300 rounded p-2 mt-1 bg-white border"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs text-gray-500 uppercase font-bold">
                              Antrag (Inhalt)
                            </label>
                            <input
                              type="text"
                              value={go.antrag}
                              onChange={(e) =>
                                updateGOAntrag(index, goIndex, 'antrag', e.target.value)
                              }
                              className="w-full border-gray-300 rounded p-2 mt-1 bg-white border"
                              placeholder="z.B. Vertagung des TOPs 7 / Schluss der Debatte"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 uppercase font-bold">
                              Gegenrede
                            </label>
                            <input
                              type="text"
                              value={go.gegenrede}
                              onChange={(e) =>
                                updateGOAntrag(index, goIndex, 'gegenrede', e.target.value)
                              }
                              className="w-full border-gray-300 rounded p-2 mt-1 bg-white border"
                              placeholder="Name oder 'Keine'"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 uppercase font-bold">
                              Ergebnis / Status
                            </label>
                            <input
                              type="text"
                              value={go.ergebnis}
                              onChange={(e) =>
                                updateGOAntrag(index, goIndex, 'ergebnis', e.target.value)
                              }
                              className="w-full border-gray-300 rounded p-2 mt-1 bg-white border"
                              placeholder="z.B. angenommen / abgelehnt"
                            />
                          </div>
                        </div>

                        {/* Optionales individuelles Abstimmungsverhalten auch für GO-Anträge (siehe PDF Seite 8) */}
                        {!go.abstimmung ? (
                          <button
                            type="button"
                            onClick={() => initGOAbstimmung(index, goIndex)}
                            className="mt-3 text-sm bg-white border border-orange-300 text-orange-800 px-3.5 py-1.5 rounded hover:bg-orange-100 font-semibold"
                          >
                            + Individuelles Abstimmungsverhalten erfassen (§ 7 Abs. 7 GO)
                          </button>
                        ) : (
                          <AbstimmungsEditor
                            abstimmung={go.abstimmung}
                            status={go.ergebnis}
                            onChangeAbstimmung={(nextAbst) =>
                              updateGOAntrag(index, goIndex, 'abstimmung', nextAbst)
                            }
                            onChangeStatus={(nextStatus) =>
                              updateGOAntrag(index, goIndex, 'ergebnis', nextStatus)
                            }
                            onRemoveAbstimmung={() =>
                              updateGOAntrag(index, goIndex, 'abstimmung', null)
                            }
                            fachschaften={fachschaften}
                            anwesendLabels={top1Anwesend}
                            accentColor="orange"
                          />
                        )}
                      </div>
                    ))}

                    {/* Aktionsleiste pro TOP */}
                    <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-200">
                      {!top.showSitzungsverlauf && (
                        <button
                          type="button"
                          onClick={() => toggleSitzungsverlauf(index)}
                          className="flex items-center gap-2 text-base bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 px-4 py-2 rounded font-bold transition"
                        >
                          <Plus size={18} /> Sitzungsverlauf erfassen
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => addManualAntrag(index)}
                        className="flex items-center gap-2 text-base bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded font-bold transition"
                      >
                        <Plus size={18} /> Antrag & Abstimmung
                      </button>
                      <button
                        type="button"
                        onClick={() => addGOAntrag(index)}
                        className="flex items-center gap-2 text-base bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-700 px-4 py-2 rounded font-bold transition"
                      >
                        <Plus size={18} /> GO-Antrag
                      </button>
                      <button
                        type="button"
                        onClick={() => addWahl(index)}
                        className="flex items-center gap-2 text-base bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded font-bold transition"
                      >
                        <Plus size={18} /> Wahl erfassen
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DRUCK ANSICHT (Sichtbar im Print-Modus oder bei aktiver Vorschau) */}
      {/* ------------------------------------------------------------- */}
      <div
        className={
          showPrintPreview
            ? 'block max-w-[210mm] mx-auto my-8 bg-white shadow-2xl p-[15mm] print:shadow-none print:m-0 print:p-0 text-black'
            : 'hidden print:block text-black min-h-screen'
        }
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @page {
              size: A4;
              margin: 20mm 15mm 25mm 15mm !important;
              @bottom-center {
                  content: counter(page);
                  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                  font-size: 11pt;
                  color: #555555;
              }
          }

          * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
              max-width: 100% !important;
          }

          html, body, .hidden.print\\:block {
              background-color: #ffffff !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
          }
          body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              font-size: 12pt;
              line-height: 1.5;
              color: #222;
          }

          .cover-page {
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              width: 100%;
              height: 240mm;
              page-break-after: always;
              break-after: page;
              background-color: transparent !important;
              position: relative;
              z-index: 1;
          }

          .cover-content {
              text-align: center;
              z-index: 10;
              width: 100%;
              position: relative;
          }

          .cover-seal {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              object-fit: contain;
              opacity: 0.15;
              z-index: -1;
              pointer-events: none;
          }

          .print-layout-table {
              width: 100%;
              max-width: 100%;
              border: none !important;
              margin: 0 !important;
              table-layout: fixed;
          }
          .print-layout-table > thead {
              display: table-header-group;
          }
          .print-layout-table > tbody {
              display: table-row-group;
          }
          .print-layout-table > thead > tr > td,
          .print-layout-table > tbody > tr > td {
              border: none !important;
              padding: 0 !important;
              background: transparent !important;
              width: 100%;
              overflow-wrap: break-word !important;
          }

          .institution { font-size: 24pt; font-weight: bold; color: #005030; margin-bottom: 10mm; text-transform: uppercase; letter-spacing: 1px; }
          .title { font-size: 26pt; font-weight: bold; margin-bottom: 5mm; color: #000000; }
          .subtitle { font-size: 18pt; color: #000000; margin-bottom: 20mm; font-weight: 500; }
          .event-details { font-size: 14pt; color: #000000; margin-bottom: 3mm; line-height: 1.6; font-weight: 500; }

          h1 { font-size: 18pt; color: #005030; border-bottom: 2px solid #005030; padding-bottom: 5px; margin-top: 0; page-break-after: avoid; break-after: avoid; page-break-inside: avoid; break-inside: avoid; margin-bottom: 20px;}
          h2 { font-size: 15pt; font-weight: bold; margin-top: 25px; margin-bottom: 10px; page-break-after: avoid; break-after: avoid; page-break-inside: avoid; break-inside: avoid; }
          h3 { font-size: 12pt; text-transform: uppercase; color: #666666; margin-top: 15px; margin-bottom: 5px; page-break-after: avoid; break-after: avoid; page-break-inside: avoid; break-inside: avoid; }

          .item-text {
              margin-bottom: 15px;
              text-align: justify;
              hyphens: auto;
              overflow-wrap: anywhere !important;
              word-break: break-word !important;
          }

          .item-text img, .antrag-box img { max-width: 100% !important; height: auto !important; }
          .item-text pre, .item-text code { white-space: pre-wrap !important; word-wrap: break-word !important; }

          .antrag-box { background-color: #f4f7f6; border-left: 5px solid #005030; padding: 15px 20px; margin-top: 15px; margin-bottom: 20px; page-break-inside: avoid; }
          .antrag-header { font-weight: bold; font-size: 11pt; color: #005030; border-bottom: 1px solid #d0ded8; padding-bottom: 8px; margin-bottom: 12px; }

          .wahl-box { background-color: #f0f9ff; border-left: 5px solid #0284c7; padding: 15px 20px; margin-top: 15px; margin-bottom: 20px; page-break-inside: avoid; }
          .wahl-header { font-weight: bold; font-size: 11pt; color: #0284c7; border-bottom: 1px solid #bae6fd; padding-bottom: 8px; margin-bottom: 12px; }

          table.wahl-table {
              width: 100%;
              max-width: 100%;
              border-collapse: collapse;
              page-break-inside: avoid;
              table-layout: fixed;
          }
          table.wahl-table th, table.wahl-table td {
              border: none;
              border-bottom: 1px solid #bae6fd;
              padding: 8px 10px;
              text-align: left;
              font-size: 11pt;
              hyphens: auto;
              overflow-wrap: anywhere !important;
              word-break: break-word !important;
              background-color: transparent !important;
          }
          table.wahl-table th { color: #0284c7; border-bottom: 2px solid #7dd3fc; }
          table.wahl-table tr:last-child td { border-bottom: none; }

          .go-box { background-color: #fff3e0; border-left: 5px solid #ff9800; padding: 12px 18px; margin-top: 10px; margin-bottom: 20px; page-break-inside: avoid; }
          .go-header { font-weight: bold; font-size: 11pt; color: #e65100; border-bottom: 1px solid #ffe0b2; padding-bottom: 6px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          .go-content { font-size: 11pt; line-height: 1.5; margin-bottom: 6px; }

          table.data-table {
              width: 100%;
              max-width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              page-break-inside: avoid;
              table-layout: fixed;
          }

          table.data-table th, table.data-table td {
              border: 1px solid #dddddd;
              padding: 10px;
              text-align: left;
              font-size: 11pt;
              hyphens: auto;
              overflow-wrap: anywhere !important;
              word-break: break-word !important;
          }
          table.data-table th { background-color: #f2f2f2; }

          .meta-table {
              width: 100%;
              max-width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              page-break-inside: avoid;
              table-layout: fixed;
          }
          .meta-table th { background-color: transparent; border: none; font-weight: bold; padding: 5px 10px 5px 0; text-align: left;}
          .meta-table td {
              border: none;
              padding: 5px 0;
              hyphens: auto;
              overflow-wrap: anywhere !important;
              word-break: break-word !important;
          }
          .meta-table tr { border-bottom: 1px solid #eeeeee; }
          .meta-table tr:last-child { border-bottom: none; }

          .toc-list { list-style-type: none; padding-left: 0; margin: 0; }
          .toc-item { display: flex; align-items: baseline; margin-bottom: 10px; width: 100%; }
          .toc-link { color: #005030; font-weight: bold; text-decoration: none; white-space: nowrap; font-size: 12pt; }
          .toc-dots { flex-grow: 1; border-bottom: 2px dotted #ccc; margin: 0 10px; position: relative; top: -4px; }

          .page-break { page-break-before: always; break-before: page; }

          /* Styling für Anhang 1: Abstimmungsübersicht gemäß LMU-Vorlage */
          .anhang-banner {
              font-size: 12pt;
              font-weight: bold;
              text-transform: uppercase;
              border-bottom: 2px solid #000000;
              padding-bottom: 3px;
              margin-bottom: 14px;
              color: #000000;
          }
          .anhang-top-title {
              font-size: 11pt;
              font-weight: normal;
              border-bottom: 1.5px solid #000000;
              padding-bottom: 2px;
              margin-bottom: 10px;
              color: #000000;
          }
          .anhang-meta-block {
              font-size: 10pt;
              line-height: 1.35;
              margin-bottom: 10px;
              color: #000000;
          }
          table.anhang-vote-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              margin-top: 4px;
              margin-bottom: 10px;
          }
          table.anhang-vote-table th {
              background-color: #009640 !important;
              color: #000000 !important;
              font-weight: bold;
              font-size: 9.5pt;
              padding: 3px 8px;
              border: 1px solid #222222;
              text-align: left;
          }
          table.anhang-vote-table td {
              font-size: 9.5pt;
              line-height: 1.2;
              padding: 2.5px 8px;
              border: 1px solid #444444;
              color: #000000;
              text-align: left;
          }
        `
          }}
        />

        {/* Deckblatt */}
        <div className="cover-page">
          <img
            src={assetUrl('Siegel.png')}
            className="cover-seal"
            alt="LMU Siegel"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="cover-content">
            <div className="institution">
              Konvent der Fachschaften
              <br />
              Ludwig-Maximilians-Universität München
            </div>
            <div className="title">Sitzungsprotokoll</div>
            <div className="subtitle">Sitzung am {formattedPrintDate()}</div>
            <div className="event-details">
              Ab {meta.beginn} Uhr c.t. in {meta.raum}
            </div>
            <div className="event-details">{meta.ort}</div>
            <div
              style={{
                fontSize: '14pt',
                marginTop: '15mm',
                color: '#000000',
                fontWeight: '500'
              }}
            >
              <strong>Stand:</strong> {new Date().toLocaleDateString('de-DE')}
            </div>
          </div>
        </div>

        {/* Hauptdokument mit sich wiederholender Kopfzeile */}
        <table className="print-layout-table">
          <thead>
            <tr>
              <td style={{ border: 'none', padding: 0 }}>
                <div style={{ paddingBottom: '2px' }}>
                  <table
                    style={{
                      width: '100%',
                      borderBottom: '1px solid #ddd',
                      marginBottom: '8px',
                      paddingBottom: '4px',
                      tableLayout: 'fixed'
                    }}
                  >
                    <tbody>
                      <tr>
                        <td
                          style={{
                            width: '50%',
                            textAlign: 'left',
                            border: 'none',
                            padding: 0
                          }}
                        >
                          <img
                            src={assetUrl('Stuve Logo lang.png')}
                            alt="StuVe Logo"
                            style={{ height: '30px' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </td>
                        <td
                          style={{
                            width: '50%',
                            textAlign: 'right',
                            verticalAlign: 'bottom',
                            border: 'none',
                            padding: 0,
                            color: '#777',
                            fontSize: '10pt',
                            whiteSpace: 'nowrap',
                            paddingBottom: '2px'
                          }}
                        >
                          Protokoll der Sitzung am {formattedPrintDate()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </thead>

          <tbody>
            {/* Sitzungsübersicht & Inhaltsverzeichnis */}
            <tr>
              <td style={{ border: 'none', padding: 0, paddingBottom: '30px' }}>
                <h1>Sitzungsübersicht</h1>
                <table className="meta-table">
                  <tbody>
                    <tr>
                      <th width="30%">Datum</th>
                      <td width="70%">{formattedPrintDate()}</td>
                    </tr>
                    <tr>
                      <th>Beginn</th>
                      <td>{meta.beginn} Uhr</td>
                    </tr>
                    <tr>
                      <th>Ende</th>
                      <td>{meta.ende ? `${meta.ende} Uhr` : ''}</td>
                    </tr>
                    <tr>
                      <th>Redeleitung</th>
                      <td>{meta.redeleitung}</td>
                    </tr>
                    <tr>
                      <th>Protokoll</th>
                      <td>{meta.protokoll}</td>
                    </tr>
                    {(meta.anhang || anhangAbstimmungen.length > 0) && (
                      <tr>
                        <th>Anhang</th>
                        <td>
                          {meta.anhang
                            ? meta.anhang
                            : 'Anhang 1: Abstimmungsübersicht gemäß § 7 (7) GO KF'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <h2 style={{ marginTop: '40px' }}>Inhaltsverzeichnis</h2>
                <ul className="toc-list">
                  {tagesordnung.map((row, i) => (
                    <li key={i} className="toc-item">
                      <a href={`#top-${row.slug}`} className="toc-link">
                        {row.item_number}: {row.title}
                      </a>
                      {row.vertagt && (
                        <em
                          style={{
                            color: '#e65100',
                            marginLeft: '8px',
                            fontWeight: 'normal'
                          }}
                        >
                          (Vertagt)
                        </em>
                      )}
                      <div className="toc-dots" />
                    </li>
                  ))}
                  {anhangAbstimmungen.length > 0 && (
                    <li className="toc-item">
                      <a href="#anhang-abstimmungsuebersicht" className="toc-link">
                        Anhang 1: Abstimmungsübersicht (§ 7 Abs. 7 GO KF)
                      </a>
                      <div className="toc-dots" />
                    </li>
                  )}
                </ul>

                <div className="page-break" />
                <h1>Tagesordnung und Protokoll</h1>
              </td>
            </tr>

            {/* Tagesordnungspunkte */}
            {tagesordnung.map((row, index) => {
              const topNumStr = String(row.item_number).trim();

              return (
                <tr key={index}>
                  <td style={{ border: 'none', padding: 0, paddingBottom: '30px' }}>
                    <h2 id={`top-${row.slug}`}>
                      <strong>
                        {topNumStr}: {row.title}
                      </strong>
                      {row.vertagt && (
                        <span
                          style={{
                            color: '#e65100',
                            marginLeft: '10px',
                            fontWeight: 'normal'
                          }}
                        >
                          {' '}
                          [Vertagt]
                        </span>
                      )}
                      {!row.vertagt && isHauptTop(topNumStr) && row.uhrzeit && (
                        <span
                          style={{
                            fontSize: '12pt',
                            color: '#555',
                            fontWeight: 'normal',
                            marginLeft: '10px'
                          }}
                        >
                          (ab {row.uhrzeit} Uhr)
                        </span>
                      )}
                    </h2>

                    {/* TOP 1 Anwesenheitsliste */}
                    {index === 0 && !row.vertagt && (
                      <>
                        <h3 style={{ color: '#005030' }}>Anwesenheitsliste</h3>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th width="35%"></th>
                              <th width="65%">Fachschaften</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>
                                <strong>Anwesende Fachschaften</strong>
                              </td>
                              <td>
                                {top1Anwesend.join(', ')}
                                <br />
                                <small>
                                  Anzahl gesamt: {top1Anwesend.length} / {fachschaften.length} (Stimmgewicht: {anwesendWeight} / {totalConstitutedWeight})
                                </small>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <strong>
                                  Beschlussfähigkeit (Anwesende Fachschaften &ge; {quorumThreshold})
                                </strong>
                              </td>
                              <td
                                style={{
                                  fontWeight: 'bold',
                                  color: isBeschlussfaehig ? '#005030' : '#b50000'
                                }}
                              >
                                {isBeschlussfaehig ? 'Ja' : 'Nein'}
                              </td>
                            </tr>
                            {top1Entschuldigt.length > 0 && (
                              <tr>
                                <td>
                                  <strong>Entschuldigt</strong>
                                </td>
                                <td>{top1Entschuldigt.join(', ')}</td>
                              </tr>
                            )}
                            {top1Ausgeschlossen.length > 0 && (
                              <tr>
                                <td>
                                  <strong>
                                    Ausgeschlossen gemäß § 52 (4) Satz 2 Grundordnung
                                  </strong>
                                </td>
                                <td>{top1Ausgeschlossen.join(', ')}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>

                        {sitzungsverlauf.length > 0 && (
                          <>
                            <h3 style={{ color: '#005030' }}>Sitzungsverlauf</h3>
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th width="20%">Uhrzeit</th>
                                  <th width="80%">Ereignisvermerk</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sitzungsverlauf.map((v, i) => (
                                  <tr key={i}>
                                    <td>
                                      <strong>{v.uhrzeit} Uhr</strong>
                                    </td>
                                    <td>{v.vermerk}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </>
                        )}
                      </>
                    )}

                    {/* Regulärer Text (aus CSV) */}
                    {!row.vertagt && row.text && (
                      <div
                        className="item-text"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeRichText(row.text)
                        }}
                      />
                    )}

                    {/* Sitzungsverlauf / Debattenprotokoll zum TOP */}
                    {!row.vertagt &&
                      row.showSitzungsverlauf &&
                      row.sitzungsverlaufText && (
                        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                          <h3 style={{ color: '#005030' }}>Sitzungsverlauf</h3>
                          <div
                            className="item-text"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeRichText(row.sitzungsverlaufText)
                            }}
                          />
                        </div>
                      )}

                    {/* Zugehörige Anträge */}
                    {!row.vertagt &&
                      row.antraege &&
                      row.antraege.map((antrag, aIdx) => {
                        let totalFs = 0;
                        let totalW = 0;
                        if (antrag.abstimmung) {
                          totalFs =
                            antrag.abstimmung.fuer.fs +
                            antrag.abstimmung.gegen.fs +
                            antrag.abstimmung.enthaltung.fs;
                          totalW =
                            antrag.abstimmung.fuer.weight +
                            antrag.abstimmung.gegen.weight +
                            antrag.abstimmung.enthaltung.weight;
                        }

                        const hasIndividualInAnhang =
                          antrag.abstimmung &&
                          antrag.abstimmung.modus === 'individuell' &&
                          antrag.abstimmung.imAnhang !== false &&
                          antrag.abstimmung.einzelstimmen &&
                          Object.keys(antrag.abstimmung.einzelstimmen).length > 0;

                        return (
                          <div className="antrag-box" key={aIdx}>
                            <div className="antrag-header">
                              Antrag {topNumStr}: {antrag.Bezeichner} | Einreichend:{' '}
                              {antrag.Antragsteller} | Status: {antrag.Status}
                            </div>

                            {antrag.Text && (
                              <>
                                <h3>Antragstext / Beschlussfassung</h3>
                                <div
                                  className="item-text"
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeRichText(antrag.Text)
                                  }}
                                />
                              </>
                            )}

                            {antrag.Begründung && (
                              <>
                                <h3>Begründung</h3>
                                <div
                                  className="item-text"
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeRichText(antrag.Begründung)
                                  }}
                                />
                              </>
                            )}

                            {antrag.abstimmung && (
                              <>
                                <h3>Abstimmungsergebnis</h3>
                                <table className="data-table">
                                  <thead>
                                    <tr>
                                      <th width="35%">Kategorie</th>
                                      <th width="32.5%">Anzahl Fachschaften</th>
                                      <th width="32.5%">Anzahl Stimmgewichte</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td>
                                        <strong>Fürstimmen</strong>
                                      </td>
                                      <td>
                                        {antrag.abstimmung.fuer.fs} (
                                        {calculateShare(antrag.abstimmung.fuer.fs, totalFs)}
                                        %)
                                      </td>
                                      <td>
                                        {antrag.abstimmung.fuer.weight} (
                                        {calculateShare(
                                          antrag.abstimmung.fuer.weight,
                                          totalW
                                        )}
                                        %)
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <strong>Gegenstimmen</strong>
                                      </td>
                                      <td>
                                        {antrag.abstimmung.gegen.fs} (
                                        {calculateShare(
                                          antrag.abstimmung.gegen.fs,
                                          totalFs
                                        )}
                                        %)
                                      </td>
                                      <td>
                                        {antrag.abstimmung.gegen.weight} (
                                        {calculateShare(
                                          antrag.abstimmung.gegen.weight,
                                          totalW
                                        )}
                                        %)
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <strong>Enthaltungen</strong>
                                      </td>
                                      <td>
                                        {antrag.abstimmung.enthaltung.fs} (
                                        {calculateShare(
                                          antrag.abstimmung.enthaltung.fs,
                                          totalFs
                                        )}
                                        %)
                                      </td>
                                      <td>
                                        {antrag.abstimmung.enthaltung.weight} (
                                        {calculateShare(
                                          antrag.abstimmung.enthaltung.weight,
                                          totalW
                                        )}
                                        %)
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <strong>Gesamt</strong>
                                      </td>
                                      <td>{totalFs}</td>
                                      <td>{totalW}</td>
                                    </tr>
                                  </tbody>
                                </table>
                                {hasIndividualInAnhang && (
                                  <div
                                    style={{
                                      fontSize: '9.5pt',
                                      color: '#444',
                                      fontStyle: 'italic'
                                    }}
                                  >
                                    Individuelles Abstimmungsverhalten der Fachschaften gemäß § 7 (7) GO KF siehe Anhang 1 (Abstimmungsübersicht).
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}

                    {/* Wahlen */}
                    {!row.vertagt &&
                      row.wahlen &&
                      row.wahlen.length > 0 &&
                      row.wahlen.map((wahl, wIdx) => (
                        <div className="wahl-box" key={wIdx}>
                          <div className="wahl-header">Wahlergebnis: {wahl.titel}</div>
                          <table className="wahl-table">
                            <thead>
                              <tr>
                                <th width="25%">Kandidat*in / Option</th>
                                <th width="25%">
                                  Fürstimmen
                                  <br />
                                  <small>(FS / Gewichte)</small>
                                </th>
                                <th width="25%">
                                  Gegenstimmen
                                  <br />
                                  <small>(FS / Gewichte)</small>
                                </th>
                                <th width="25%">
                                  Enthaltungen
                                  <br />
                                  <small>(FS / Gewichte)</small>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {wahl.kandidaten.map((k, kIdx) => (
                                <tr key={kIdx}>
                                  <td>
                                    <strong>{k.name}</strong>
                                  </td>
                                  <td>
                                    {k.fuer.fs} / {k.fuer.weight}
                                  </td>
                                  <td>
                                    {k.gegen.fs} / {k.gegen.weight}
                                  </td>
                                  <td>
                                    {k.enthaltung.fs} / {k.enthaltung.weight}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}

                    {/* GO-Anträge */}
                    {!row.vertagt &&
                      row.goAntraege &&
                      row.goAntraege.length > 0 && (
                        <div className="go-box">
                          <div className="go-header">Antrag zur Geschäftsordnung</div>
                          {row.goAntraege.map((go, gIdx) => {
                            const hasGoAnhang =
                              go.abstimmung &&
                              go.abstimmung.modus === 'individuell' &&
                              go.abstimmung.imAnhang !== false &&
                              go.abstimmung.einzelstimmen &&
                              Object.keys(go.abstimmung.einzelstimmen).length > 0;
                            return (
                              <div key={gIdx} className="go-content">
                                <strong>Einreichend:</strong> {go.einreichend}
                                <br />
                                {go.uhrzeit && (
                                  <>
                                    <strong>Uhrzeit:</strong> {go.uhrzeit} Uhr
                                    <br />
                                  </>
                                )}
                                <strong>Antrag:</strong> {go.antrag}
                                <br />
                                <strong>Gegenrede:</strong> {go.gegenrede}
                                <br />
                                <strong>Abstimmungsergebnis:</strong> {go.ergebnis}
                                {go.abstimmung && (
                                  <>
                                    {' '}
                                    (Ja: {go.abstimmung.fuer.weight} Gew. /{' '}
                                    {go.abstimmung.fuer.fs} FS | Nein:{' '}
                                    {go.abstimmung.gegen.weight} Gew. /{' '}
                                    {go.abstimmung.gegen.fs} FS | Enth.:{' '}
                                    {go.abstimmung.enthaltung.weight} Gew. /{' '}
                                    {go.abstimmung.enthaltung.fs} FS)
                                  </>
                                )}
                                {hasGoAnhang && (
                                  <div
                                    style={{
                                      fontSize: '9.5pt',
                                      color: '#7c2d12',
                                      fontStyle: 'italic',
                                      marginTop: '3px'
                                    }}
                                  >
                                    Individuelles Abstimmungsverhalten gemäß § 7 (7) GO KF siehe Anhang 1.
                                  </div>
                                )}
                                {gIdx < row.goAntraege.length - 1 && (
                                  <hr
                                    style={{
                                      borderTop: '1px dashed #ffe0b2',
                                      margin: '8px 0'
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </td>
                </tr>
              );
            })}

            {/* ------------------------------------------------------------- */}
            {/* ANHANG 1: ABSTIMMUNGSÜBERSICHT NACH § 7 (7) GO KF              */}
            {/* ------------------------------------------------------------- */}
            {anhangAbstimmungen.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ border: 'none', padding: 0 }}>
                  <div
                    className="page-break"
                    id={idx === 0 ? 'anhang-abstimmungsuebersicht' : undefined}
                  >
                    {idx === 0 && (
                      <div className="anhang-banner">
                        ANHANG 1: ABSTIMMUNGSÜBERSICHT – SITZUNG VOM{' '}
                        {formattedPrintDateLong()}
                      </div>
                    )}

                    <div className="anhang-top-title">{item.heading}</div>

                    <div className="anhang-meta-block">
                      {item.antragsteller && (
                        <div>Antragsteller*in: {item.antragsteller}</div>
                      )}
                      <div>Status: {item.status}</div>
                      <div>Gültige Stimmen gesamt: {item.totalWeight}</div>
                      <br />
                      <div>Allgemeines Ergebnis:</div>
                      <div>
                        - JA: Summe der Stimmgewichte: {item.fuer.weight} (
                        {formatGermanPercent(item.fuer.weight, item.totalWeight)} %) | Anzahl der Fachschaften: {item.fuer.fs}
                      </div>
                      <div>
                        - NEIN: Summe der Stimmgewichte: {item.gegen.weight} (
                        {formatGermanPercent(item.gegen.weight, item.totalWeight)} %) | Anzahl der Fachschaften: {item.gegen.fs}
                      </div>
                      <div>
                        - ENTHALTUNGEN: Summe der Stimmgewichte: {item.enthaltung.weight} (
                        {formatGermanPercent(
                          item.enthaltung.weight,
                          item.totalWeight
                        )}{' '}
                        %) | Anzahl der Fachschaften: {item.enthaltung.fs}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: '10pt',
                        fontWeight: 'bold',
                        color: '#000000',
                        marginBottom: '2px'
                      }}
                    >
                      Individuelles Abstimmungsverhalten:
                    </div>

                    <table className="anhang-vote-table">
                      <thead>
                        <tr>
                          <th width="25%">FS-Nr.</th>
                          <th width="50%">Fachschaft</th>
                          <th width="25%">Stimmen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.details.map((rowDetail) => (
                          <tr key={rowDetail.nr}>
                            <td>{rowDetail.nr}</td>
                            <td>{rowDetail.name}</td>
                            <td>{rowDetail.stimme}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
