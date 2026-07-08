import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckSquare, Clock, Plus, Trash2, Printer, ChevronDown, ChevronUp } from 'lucide-react';

// --- HILFSFUNKTIONEN ---

const slugify = (text) => {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

const calculateShare = (value, total) => {
  if (total <= 0) return "0.0";
  return ((value / total) * 100).toFixed(1);
};

// Eigener, robuster CSV Parser für den Browser (ersetzt Pandas)
const parseCSV = (csvText) => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  // Trennzeichen erkennen (Semikolon oder Komma)
  const headerLine = lines[0];
  const separator = (headerLine.split(';').length > headerLine.split(',').length) ? ';' : ',';

  const parseLine = (line) => {
    const result = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"') {
        cell += '"';
        i++; // Escape-Quote überspringen
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(cell.trim());
        cell = '';
      } else {
        cell += char;
      }
    }
    result.push(cell.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  return data;
};

// Liste aller Fachschaften (anpassbar)
const FACHSCHAFTEN_LIST = [
  "FS BWL", "FS VWL", "FS Jura", "FS Medizin", "FS Physik", 
  "FS Chemie", "FS Biologie", "FS Informatik", "FS Mathematik", 
  "FS Geschichte", "FS Philosophie", "FS Psychologie", "FS Soziologie",
  "FS Kunstpädagogik", "FS Tiermedizin", "FS Pharmazie", "FS Theologie (ev.)",
  "FS Theologie (kath.)", "FS Geowissenschaften", "FS Ethnologie", "FS Anglistik",
  "FS Germanistik", "FS Romanistik", "FS Skandinavistik"
].sort();

// --- KOMPONENTEN ---

// Custom Multi-Select Dropdown Component
const MultiSelect = ({ options, selected, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="min-h-[42px] border border-gray-300 rounded-md p-2 flex flex-wrap gap-2 cursor-pointer bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selected.length === 0 && <span className="text-gray-400">{placeholder}</span>}
        {selected.map(item => (
          <span key={item} className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-sm flex items-center">
            {item}
            <button 
              onClick={(e) => { e.stopPropagation(); toggleOption(item); }}
              className="ml-1 text-emerald-600 hover:text-emerald-900 font-bold"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {options.map(option => (
            <div 
              key={option} 
              className="px-3 py-2 hover:bg-emerald-50 cursor-pointer flex items-center"
              onClick={() => toggleOption(option)}
            >
              <input 
                type="checkbox" 
                checked={selected.includes(option)} 
                readOnly 
                className="mr-2 cursor-pointer accent-emerald-600"
              />
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main App Component
export default function App() {
  // Metadaten State
  const [meta, setMeta] = useState({
    datum: '', beginn: '18:15', ende: '', redeleitung: '', protokoll: '', anhang: ''
  });

  // Tagesordnung & Anträge State
  const [tagesordnung, setTagesordnung] = useState([]);
  const [antraegeRaw, setAntraegeRaw] = useState([]);

  // TOP 1 State
  const [top1Anwesend, setTop1Anwesend] = useState([]);
  const [top1Entschuldigt, setTop1Entschuldigt] = useState([]);
  const [top1Ausgeschlossen, setTop1Ausgeschlossen] = useState([]);
  const [sitzungsverlauf, setSitzungsverlauf] = useState([]);

  // Dynamischer State für alle anderen TOPs wird direkt im tagesordnung-Array gespeichert
  // Struktur pro Element in tagesordnung: 
  // { item_number, title, text, slug, vertagt: bool, uhrzeit: string, goAntraege: [], antraege: [] }

  const handleFileUpload = (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = parseCSV(e.target.result);
      if (type === 'tagesordnung') {
        // Initialisiere die TOPs mit UI-spezifischen Feldern
        const enrichedData = data.map(row => ({
          ...row,
          item_number: (row.item_number || "").replace(/\.0$/, "").trim(),
          title: (row.title || "").trim(),
          slug: slugify(row.title || ""),
          vertagt: false,
          uhrzeit: '',
          goAntraege: [],
          antraege: [] // Wird später gematched
        }));
        setTagesordnung(enrichedData);
      } else {
        setAntraegeRaw(data);
      }
    };
    reader.readAsText(file);
  };

  // Mappe Anträge auf Tagesordnung, wenn beide geladen sind
  useEffect(() => {
    if (tagesordnung.length > 0 && antraegeRaw.length > 0) {
      setTagesordnung(prevTo => prevTo.map(top => {
        // Matche anhand des exakten Titels (gestrippt)
        const matchingAntraege = antraegeRaw.filter(a => 
          (a.Titel || "").trim() === top.title
        ).map(a => ({
          ...a,
          Bezeichner: a.Bezeichner || '',
          Antragsteller: a['Antragsteller*in'] || '',
          Status: a.Status || '',
          Text: a.Text || '',
          Begründung: a.Begründung || '',
          abstimmung: null // Wird im UI befüllt falls nötig
        }));
        
        // Nur updaten, wenn es Änderungen gibt (verhindert Endlosschleife)
        if (JSON.stringify(top.antraege) !== JSON.stringify(matchingAntraege) && top.antraege.length === 0) {
            return { ...top, antraege: matchingAntraege };
        }
        return top;
      }));
    }
  }, [antraegeRaw]); // Dependency absichtlich nur auf antraegeRaw, um manuell gesetzte States in tagesordnung nicht zu überschreiben


  // --- UI Handler für TOP Modifikationen ---
  const updateTop = (index, field, value) => {
    const newTo = [...tagesordnung];
    newTo[index][field] = value;
    setTagesordnung(newTo);
  };

  const addGOAntrag = (topIndex) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].goAntraege.push({
      einreichend: '', uhrzeit: '', antrag: '', gegenrede: '', ergebnis: ''
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

  const addSitzungsverlauf = () => {
    setSitzungsverlauf([...sitzungsverlauf, { uhrzeit: '', vermerk: '' }]);
  };

  const initAbstimmung = (topIndex, antragIndex) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].antraege[antragIndex].abstimmung = {
      fuer: { fs: 0, weight: 0 },
      gegen: { fs: 0, weight: 0 },
      enthaltung: { fs: 0, weight: 0 }
    };
    setTagesordnung(newTo);
  };

  const updateAbstimmung = (topIndex, antragIndex, type, field, value) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].antraege[antragIndex].abstimmung[type][field] = Number(value) || 0;
    setTagesordnung(newTo);
  };

  // --- Render Hilfsfunktionen ---
  const handlePrint = () => {
    window.print();
  };

  const formattedPrintDate = () => {
    if (!meta.datum) return "";
    try {
      // Annahme Input Format: YYYY-MM-DD
      const dateParts = meta.datum.split('-');
      if (dateParts.length === 3) {
        return `${dateParts[2]}.${dateParts[1]}.${dateParts[0].substring(2)}`;
      }
      return meta.datum;
    } catch { return meta.datum; }
  };

  const isHauptTop = (item_number) => {
      return item_number && !item_number.toString().includes(".");
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* ------------------------------------------------------------- */}
      {/* EDITOR ANSICHT (Wird beim Drucken versteckt via 'print:hidden') */}
      {/* ------------------------------------------------------------- */}
      <div className="print:hidden max-w-5xl mx-auto p-6 space-y-8">
        
        <div className="flex justify-between items-center bg-emerald-800 text-white p-6 rounded-xl shadow-lg">
          <div>
            <h1 className="text-2xl font-bold">Protokoll Generator</h1>
            <p className="text-emerald-100 mt-1">Konvent der Fachschaften, LMU München</p>
          </div>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white text-emerald-800 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition shadow"
          >
            <Printer size={20} /> Protokoll exportieren (PDF)
          </button>
        </div>

        {/* --- SCHRITT 1: METADATEN & UPLOAD --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
            <FileText size={24}/> 1. Rahmendaten & Dateien
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum der Sitzung</label>
              <input type="date" value={meta.datum} onChange={e => setMeta({...meta, datum: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beginn (Uhrzeit)</label>
              <input type="time" value={meta.beginn} onChange={e => setMeta({...meta, beginn: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ende (Uhrzeit)</label>
              <input type="time" value={meta.ende} onChange={e => setMeta({...meta, ende: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Redeleitung</label>
              <input type="text" value={meta.redeleitung} onChange={e => setMeta({...meta, redeleitung: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border" placeholder="Name 1, Name 2..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Protokollführung</label>
              <input type="text" value={meta.protokoll} onChange={e => setMeta({...meta, protokoll: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border" placeholder="Name..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anhang (Optional)</label>
              <input type="text" value={meta.anhang} onChange={e => setMeta({...meta, anhang: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border" placeholder="z.B. Präsentation TOP 4" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tagesordnung (.csv)</label>
              <input type="file" accept=".csv" onChange={e => handleFileUpload(e, 'tagesordnung')} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Anträge (.csv) <span className="font-normal text-gray-500">(Optional)</span></label>
              <input type="file" accept=".csv" onChange={e => handleFileUpload(e, 'antraege')} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
            </div>
          </div>
        </div>

        {/* --- SCHRITT 2: TOP 1 ANWESENHEIT --- */}
        {tagesordnung.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-200 border-l-4 border-l-emerald-600">
            <h2 className="text-xl font-bold text-emerald-800 mb-4">TOP 1: Präsenzmatrix & Beschlussfähigkeit</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Anwesende Fachschaften</label>
                <MultiSelect 
                  options={FACHSCHAFTEN_LIST} 
                  selected={top1Anwesend} 
                  onChange={setTop1Anwesend} 
                  placeholder="Fachschaften auswählen..." 
                />
                <div className="mt-2 text-sm">
                  Aktuelle Stimmenanzahl: <span className="font-bold">{top1Anwesend.length}</span> / 
                  Beschlussfähig (&ge; 24): <span className={`font-bold ${top1Anwesend.length >= 24 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {top1Anwesend.length >= 24 ? 'Ja' : 'Nein'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Entschuldigte Fachschaften</label>
                  <MultiSelect 
                    options={FACHSCHAFTEN_LIST.filter(f => !top1Anwesend.includes(f))} 
                    selected={top1Entschuldigt} 
                    onChange={setTop1Entschuldigt} 
                    placeholder="Wählen..." 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Ausgeschlossen (§ 52 (4) Satz 2 GrundO)</label>
                  <MultiSelect 
                    options={FACHSCHAFTEN_LIST.filter(f => !top1Anwesend.includes(f) && !top1Entschuldigt.includes(f))} 
                    selected={top1Ausgeschlossen} 
                    onChange={setTop1Ausgeschlossen} 
                    placeholder="Wählen..." 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-700">Chronologischer Sitzungsverlauf (Mutationen)</label>
                  <button onClick={addSitzungsverlauf} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded flex items-center gap-1">
                    <Plus size={14} /> Eintrag
                  </button>
                </div>
                {sitzungsverlauf.map((v, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <input type="time" value={v.uhrzeit} onChange={e => {
                      const newV = [...sitzungsverlauf]; newV[i].uhrzeit = e.target.value; setSitzungsverlauf(newV);
                    }} className="w-32 border border-gray-300 p-1 rounded text-sm" />
                    <input type="text" value={v.vermerk} onChange={e => {
                      const newV = [...sitzungsverlauf]; newV[i].vermerk = e.target.value; setSitzungsverlauf(newV);
                    }} className="flex-1 border border-gray-300 p-1 rounded text-sm" placeholder="z.B. FS XY kommt nach." />
                    <button onClick={() => {
                      const newV = [...sitzungsverlauf]; newV.splice(i, 1); setSitzungsverlauf(newV);
                    }} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- SCHRITT 3: DYNAMISCHE TAGESORDNUNG --- */}
        {tagesordnung.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-gray-200 pb-2">Tagesordnungspunkte</h2>
            
            {tagesordnung.map((top, index) => {
              // TOP 1 wurde bereits speziell behandelt, wir zeigen ihn hier minimal oder überspringen ihn im Editor. 
              // Für Transparenz zeigen wir den Header.
              
              return (
              <div key={index} className={`bg-white rounded-xl shadow-sm border ${top.vertagt ? 'border-orange-300 opacity-75' : 'border-gray-200'} overflow-hidden`}>
                {/* TOP Header */}
                <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <h3 className="font-bold text-lg text-gray-800">
                    {top.item_number}: {top.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-sm">
                    {isHauptTop(top.item_number) && (
                      <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-300">
                        <Clock size={16} className="text-gray-500" />
                        <input 
                          type="time" 
                          value={top.uhrzeit} 
                          onChange={(e) => updateTop(index, 'uhrzeit', e.target.value)}
                          className="outline-none bg-transparent"
                        />
                      </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200 text-orange-800 font-medium hover:bg-orange-100">
                      <input 
                        type="checkbox" 
                        checked={top.vertagt} 
                        onChange={(e) => updateTop(index, 'vertagt', e.target.checked)}
                        className="accent-orange-600 w-4 h-4"
                      />
                      Vertagt
                    </label>
                  </div>
                </div>

                {/* TOP Content (Versteckt, wenn vertagt) */}
                {!top.vertagt && (
                  <div className="p-4 space-y-6">
                    {/* Gematchte Anträge */}
                    {top.antraege.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-bold text-emerald-800 border-b border-emerald-100 pb-1">Zugehörige Anträge</h4>
                        {top.antraege.map((antrag, aIndex) => (
                          <div key={aIndex} className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded-r-lg">
                            <div className="text-sm text-gray-500 mb-2">
                              <strong>Bezeichner:</strong> {antrag.Bezeichner} | <strong>Einreichend:</strong> {antrag.Antragsteller} | <strong>Status:</strong> {antrag.Status}
                            </div>
                            
                            {/* Abstimmungs-Editor */}
                            {!antrag.abstimmung ? (
                              <button 
                                onClick={() => initAbstimmung(index, aIndex)}
                                className="mt-2 text-sm bg-white border border-emerald-300 text-emerald-700 px-3 py-1 rounded hover:bg-emerald-100"
                              >
                                + Abstimmungsergebnis erfassen
                              </button>
                            ) : (
                              <div className="mt-4 bg-white p-3 rounded border border-emerald-200">
                                <h5 className="text-sm font-bold mb-2">Abstimmungsergebnis</h5>
                                <div className="grid grid-cols-4 gap-2 text-sm text-center">
                                  <div></div><div className="font-medium text-gray-600">Dafür</div><div className="font-medium text-gray-600">Dagegen</div><div className="font-medium text-gray-600">Enthaltung</div>
                                  
                                  <div className="text-left font-medium">Fachschaften</div>
                                  <input type="number" min="0" value={antrag.abstimmung.fuer.fs} onChange={e => updateAbstimmung(index, aIndex, 'fuer', 'fs', e.target.value)} className="border rounded p-1" />
                                  <input type="number" min="0" value={antrag.abstimmung.gegen.fs} onChange={e => updateAbstimmung(index, aIndex, 'gegen', 'fs', e.target.value)} className="border rounded p-1" />
                                  <input type="number" min="0" value={antrag.abstimmung.enthaltung.fs} onChange={e => updateAbstimmung(index, aIndex, 'enthaltung', 'fs', e.target.value)} className="border rounded p-1" />
                                  
                                  <div className="text-left font-medium">Stimmgewichte</div>
                                  <input type="number" min="0" value={antrag.abstimmung.fuer.weight} onChange={e => updateAbstimmung(index, aIndex, 'fuer', 'weight', e.target.value)} className="border rounded p-1" />
                                  <input type="number" min="0" value={antrag.abstimmung.gegen.weight} onChange={e => updateAbstimmung(index, aIndex, 'gegen', 'weight', e.target.value)} className="border rounded p-1" />
                                  <input type="number" min="0" value={antrag.abstimmung.enthaltung.weight} onChange={e => updateAbstimmung(index, aIndex, 'enthaltung', 'weight', e.target.value)} className="border rounded p-1" />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* GO Anträge */}
                    <div className="space-y-3">
                      {top.goAntraege.map((go, goIndex) => (
                        <div key={goIndex} className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg relative">
                          <button onClick={() => removeGOAntrag(index, goIndex)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                          <h4 className="font-bold text-orange-800 mb-3 text-sm uppercase">GO-Antrag</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div><label className="block text-xs text-gray-500">Einreichend</label><input type="text" value={go.einreichend} onChange={e => updateGOAntrag(index, goIndex, 'einreichend', e.target.value)} className="w-full border-gray-300 rounded p-1 mt-1" /></div>
                            <div><label className="block text-xs text-gray-500">Uhrzeit</label><input type="time" value={go.uhrzeit} onChange={e => updateGOAntrag(index, goIndex, 'uhrzeit', e.target.value)} className="w-full border-gray-300 rounded p-1 mt-1" /></div>
                            <div className="md:col-span-2"><label className="block text-xs text-gray-500">Antrag (Inhalt)</label><input type="text" value={go.antrag} onChange={e => updateGOAntrag(index, goIndex, 'antrag', e.target.value)} className="w-full border-gray-300 rounded p-1 mt-1" placeholder="z.B. Schluss der Debatte" /></div>
                            <div><label className="block text-xs text-gray-500">Gegenrede</label><input type="text" value={go.gegenrede} onChange={e => updateGOAntrag(index, goIndex, 'gegenrede', e.target.value)} className="w-full border-gray-300 rounded p-1 mt-1" placeholder="Name oder 'Keine'" /></div>
                            <div><label className="block text-xs text-gray-500">Ergebnis</label><input type="text" value={go.ergebnis} onChange={e => updateGOAntrag(index, goIndex, 'ergebnis', e.target.value)} className="w-full border-gray-300 rounded p-1 mt-1" placeholder="z.B. 15/2/3 oder Angenommen" /></div>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => addGOAntrag(index)}
                        className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded font-medium transition"
                      >
                        <Plus size={16} /> GO-Antrag hinzufügen
                      </button>
                    </div>

                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DRUCK ANSICHT (Nur sichtbar im Print-Modus via 'hidden print:block') */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden print:block bg-white text-black min-h-screen">
        <style dangerouslySetInnerHTML={{__html: `
          @page {
              size: A4;
              margin: 25mm 20mm;
              @bottom-center {
                  content: counter(page);
                  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                  font-size: 9pt;
                  color: #555555;
              }
          }
          /* Custom Print Reset */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #222; }
          
          .cover-page { text-align: center; margin-top: 60mm; page-break-after: always; position: relative; }
          .institution { font-size: 16pt; font-weight: bold; color: #005030; margin-bottom: 10mm; text-transform: uppercase; letter-spacing: 1px; }
          .title { font-size: 24pt; font-weight: bold; margin-bottom: 5mm; }
          .subtitle { font-size: 16pt; color: #555555; margin-bottom: 30mm; }
          .event-details { font-size: 12pt; color: #333333; margin-bottom: 3mm; line-height: 1.6; }

          h1 { font-size: 18pt; color: #005030; border-bottom: 2px solid #005030; padding-bottom: 5px; margin-top: 0; page-break-after: avoid; margin-bottom: 20px;}
          h2 { font-size: 14pt; margin-top: 25px; margin-bottom: 10px; page-break-after: avoid; }
          h3 { font-size: 11pt; text-transform: uppercase; color: #666666; margin-top: 15px; margin-bottom: 5px; page-break-after: avoid; }

          .item-text { margin-bottom: 15px; text-align: justify; hyphens: auto;}

          /* Styling für inhaltliche Anträge */
          .antrag-box { background-color: #f4f7f6; border-left: 5px solid #005030; padding: 15px 20px; margin-top: 15px; margin-bottom: 20px; page-break-inside: avoid; }
          .antrag-header { font-weight: bold; font-size: 10pt; color: #005030; border-bottom: 1px solid #d0ded8; padding-bottom: 8px; margin-bottom: 12px; }

          /* Styling für GO-Anträge */
          .go-box { background-color: #fff3e0; border-left: 5px solid #ff9800; padding: 12px 18px; margin-top: 10px; margin-bottom: 20px; page-break-inside: avoid; }
          .go-header { font-weight: bold; font-size: 10.5pt; color: #e65100; border-bottom: 1px solid #ffe0b2; padding-bottom: 6px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          .go-content { font-size: 10pt; line-height: 1.5; margin-bottom: 6px; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; page-break-inside: avoid; }
          th, td { border: 1px solid #dddddd; padding: 10px; text-align: left; font-size: 10pt; }
          th { background-color: #f2f2f2; }

          .meta-table th { background-color: transparent; border: none; font-weight: bold; padding: 5px 10px 5px 0;}
          .meta-table td { border: none; padding: 5px 0;}
          .meta-table tr { border-bottom: 1px solid #eeeeee; }
          .meta-table tr:last-child { border-bottom: none; }

          .toc-list { list-style-type: none; padding-left: 0; }
          .toc-list li { margin-bottom: 8px; }
          .toc-list span { color: #005030; font-weight: bold; }

          .page-break { page-break-before: always; }
        `}} />

        {/* Deckblatt */}
        <div className="cover-page">
            <div className="institution">Konvent der Fachschaften<br/>Ludwig-Maximilians-Universität München</div>
            <div className="title">Sitzungsprotokoll</div>
            <div className="subtitle">Sitzung am {formattedPrintDate()}</div>
            <div className="event-details">Ab {meta.beginn} Uhr c.t. in F007</div>
            <div className="event-details">Geschwister-Scholl-Platz 1</div>
            <div style={{fontSize: '12pt', marginTop: '15mm'}}><strong>Stand:</strong> {new Date().toLocaleDateString('de-DE')}</div>
        </div>

        <div className="page-break"></div>

        {/* Metadaten & Inhaltsverzeichnis */}
        <h1>Sitzungsübersicht</h1>
        <table className="meta-table">
            <tbody>
              <tr><th width="30%">Datum</th><td width="70%">{formattedPrintDate()}</td></tr>
              <tr><th>Beginn</th><td>{meta.beginn} Uhr</td></tr>
              <tr><th>Ende</th><td>{meta.ende ? `${meta.ende} Uhr` : ''}</td></tr>
              <tr><th>Redeleitung</th><td>{meta.redeleitung}</td></tr>
              <tr><th>Protokoll</th><td>{meta.protokoll}</td></tr>
              {meta.anhang && <tr><th>Anhang</th><td>{meta.anhang}</td></tr>}
            </tbody>
        </table>

        <h2>Inhaltsverzeichnis</h2>
        <ul className="toc-list">
            {tagesordnung.map((row, i) => (
                <li key={i}>
                  <span>{row.item_number}: {row.title}</span>
                  {row.vertagt && <em style={{color: '#e65100', marginLeft: '8px', fontWeight:'normal'}}>(Vertagt)</em>}
                </li>
            ))}
        </ul>

        <div className="page-break"></div>

        {/* Tagesordnung und Protokoll */}
        <h1>Tagesordnung und Protokoll</h1>

        {tagesordnung.map((row, index) => {
          const topNumStr = String(row.item_number).trim();
          
          return (
            <div key={index}>
              <h2>
                {topNumStr}: {row.title}
                {row.vertagt && <span style={{color: '#e65100', marginLeft: '10px'}}> [Vertagt]</span>}
                {!row.vertagt && isHauptTop(topNumStr) && row.uhrzeit && (
                  <span style={{fontSize: '11pt', color: '#555', fontWeight: 'normal', marginLeft: '10px'}}>
                    (ab {row.uhrzeit} Uhr)
                  </span>
                )}
              </h2>

              {/* TOP 1 Speziallogik */}
              {topNumStr === '1' && !row.vertagt && (
                <>
                  <h3 style={{color: '#005030'}}>Anwesenheitsliste</h3>
                  <table>
                      <thead>
                          <tr><th width="35%"></th><th width="65%">Fachschaften</th></tr>
                      </thead>
                      <tbody>
                          <tr>
                              <td><strong>Anwesende Fachschaften</strong></td>
                              <td>{top1Anwesend.join(', ')}<br/><small>Anzahl gesamt: {top1Anwesend.length}</small></td>
                          </tr>
                          <tr>
                              <td><strong>Beschlussfähigkeit (Anwesende Fachschaften &ge; 24)</strong></td>
                              <td style={{fontWeight: 'bold', color: top1Anwesend.length >= 24 ? '#005030' : '#b50000'}}>
                                  {top1Anwesend.length >= 24 ? 'Ja' : 'Nein'}
                              </td>
                          </tr>
                          {top1Entschuldigt.length > 0 && (
                          <tr>
                              <td><strong>Entschuldigt</strong></td>
                              <td>{top1Entschuldigt.join(', ')}</td>
                          </tr>
                          )}
                          {top1Ausgeschlossen.length > 0 && (
                          <tr>
                              <td><strong>Ausgeschlossen gemäß § 52 (4) Satz 2 Grundordnung</strong></td>
                              <td>{top1Ausgeschlossen.join(', ')}</td>
                          </tr>
                          )}
                      </tbody>
                  </table>

                  {sitzungsverlauf.length > 0 && (
                  <>
                    <h3 style={{color: '#005030'}}>Sitzungsverlauf</h3>
                    <table>
                        <thead>
                            <tr><th width="20%">Uhrzeit</th><th width="80%">Ereignisvermerk</th></tr>
                        </thead>
                        <tbody>
                            {sitzungsverlauf.map((v, i) => (
                            <tr key={i}>
                                <td><strong>{v.uhrzeit} Uhr</strong></td>
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
                  <div className="item-text" dangerouslySetInnerHTML={{__html: row.text.replace(/\n/g, '<br/>')}}></div>
              )}

              {/* Zugehörige Anträge */}
              {!row.vertagt && row.antraege && row.antraege.map((antrag, aIdx) => {
                
                // Dynamische Berechnung für Abstimmung
                let totalFs = 0, totalW = 0;
                if (antrag.abstimmung) {
                  totalFs = antrag.abstimmung.fuer.fs + antrag.abstimmung.gegen.fs + antrag.abstimmung.enthaltung.fs;
                  totalW = antrag.abstimmung.fuer.weight + antrag.abstimmung.gegen.weight + antrag.abstimmung.enthaltung.weight;
                }

                return (
                  <div className="antrag-box" key={aIdx}>
                      <div className="antrag-header">
                          Antrag: {antrag.Bezeichner} | Einreichend: {antrag.Antragsteller} | Status: {antrag.Status}
                      </div>

                      {antrag.Text && (
                        <>
                          <h3>Antragstext / Beschluss</h3>
                          <div className="item-text" dangerouslySetInnerHTML={{__html: antrag.Text.replace(/\n/g, '<br/>')}}></div>
                        </>
                      )}

                      {antrag.Begründung && (
                        <>
                          <h3>Begründung</h3>
                          <div className="item-text" dangerouslySetInnerHTML={{__html: antrag.Begründung.replace(/\n/g, '<br/>')}}></div>
                        </>
                      )}

                      {antrag.abstimmung && (
                          <>
                          <h3>Abstimmungsergebnis</h3>
                          <table>
                              <thead>
                                  <tr>
                                      <th width="35%">Kategorie</th>
                                      <th width="32.5%">Anzahl Fachschaften</th>
                                      <th width="32.5%">Anzahl Stimmgewichte</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  <tr>
                                      <td><strong>Fürstimmen</strong></td>
                                      <td>{antrag.abstimmung.fuer.fs} ({calculateShare(antrag.abstimmung.fuer.fs, totalFs)}%)</td>
                                      <td>{antrag.abstimmung.fuer.weight} ({calculateShare(antrag.abstimmung.fuer.weight, totalW)}%)</td>
                                  </tr>
                                  <tr>
                                      <td><strong>Gegenstimmen</strong></td>
                                      <td>{antrag.abstimmung.gegen.fs} ({calculateShare(antrag.abstimmung.gegen.fs, totalFs)}%)</td>
                                      <td>{antrag.abstimmung.gegen.weight} ({calculateShare(antrag.abstimmung.gegen.weight, totalW)}%)</td>
                                  </tr>
                                  <tr>
                                      <td><strong>Enthaltungen</strong></td>
                                      <td>{antrag.abstimmung.enthaltung.fs} ({calculateShare(antrag.abstimmung.enthaltung.fs, totalFs)}%)</td>
                                      <td>{antrag.abstimmung.enthaltung.weight} ({calculateShare(antrag.abstimmung.enthaltung.weight, totalW)}%)</td>
                                  </tr>
                                  <tr>
                                      <td><strong>Gesamt</strong></td>
                                      <td>{totalFs}</td>
                                      <td>{totalW}</td>
                                  </tr>
                              </tbody>
                          </table>
                          </>
                      )}
                  </div>
                );
              })}

              {/* GO-Anträge */}
              {!row.vertagt && row.goAntraege && row.goAntraege.length > 0 && (
                  <div className="go-box">
                      <div className="go-header">Antrag zur Geschäftsordnung</div>
                      {row.goAntraege.map((go, gIdx) => (
                          <div key={gIdx} className="go-content">
                              <strong>Einreichend:</strong> {go.einreichend}<br/>
                              <strong>Uhrzeit:</strong> {go.uhrzeit} Uhr<br/>
                              <strong>Antrag:</strong> {go.antrag}<br/>
                              <strong>Gegenrede:</strong> {go.gegenrede}<br/>
                              <strong>Abstimmungsergebnis:</strong> {go.ergebnis}
                              {gIdx < row.goAntraege.length - 1 && <hr style={{borderTop: '1px dashed #ffe0b2', margin: '8px 0'}} />}
                          </div>
                      ))}
                  </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}