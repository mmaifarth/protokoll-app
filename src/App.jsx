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
        i++; 
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

const FACHSCHAFTEN_LIST = [
  "01 Katholische Theologie",
  "02 Evangelische Theologie",
  "03 Jura",
  "04 Betriebswirtschaft",
  "05 Volkswirtschaft",
  "06 Medizin",
  "07 Zahnmedizin",
  "08 Tiermedizin",
  "09 Geschichte",
  "10 Kunstgeschichte",
  "11 Bildende Kunst",
  "12 Musikwissenschaft",
  "13 Theaterwissenschaft",
  "14 Philosophie",
  "16 Grundschul- und Sonderpädagogik",
  "17 Pädagogik",
  "18 Psychologie",
  "19 Schulpsychologie",
  "21 Japanologie",
  "22 Archäologie und Altertum",
  "23 Naher und Mittlerer Osten/Byzantinistik",
  "24 Sinologie/Indologie/Tibetologie",
  "25 Ethnologie",
  "26 Kulturwissenschaft",
  "27 Amerikanistik",
  "28 Anglistik",
  "29 Computerlinguistik",
  "30 Deutsch als Fremdsprache",
  "31 Germanistik",
  "33 Klassische Philologie",
  "34 Allgemeine und Vergleichende Literaturwissenschaft",
  "35 Skandinavistik/Buchwissenschaften",
  "36 Romanistik",
  "38 Sprachwissenschaften",
  "39 Kommunikationswissenschaft",
  "40 Politische Wissenschaft",
  "41 Soziologie",
  "42 Bioinformatik",
  "43 Informatik",
  "44 Mathematik",
  "46 Statistik und Data Science",
  "48 Physik",
  "49 Chemie",
  "50 Pharmazie",
  "51 Biologie",
  "52 Geographie",
  "53 Geowissenschaften"
].sort();

// --- KOMPONENTEN ---

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
  const [meta, setMeta] = useState({
    datum: '', beginn: '18:15', ende: '', redeleitung: '', protokoll: '', anhang: ''
  });

  const [tagesordnung, setTagesordnung] = useState([]);
  const [antraegeRaw, setAntraegeRaw] = useState([]);

  const [top1Anwesend, setTop1Anwesend] = useState([]);
  const [top1Entschuldigt, setTop1Entschuldigt] = useState([]);
  const [top1Ausgeschlossen, setTop1Ausgeschlossen] = useState([]);
  const [sitzungsverlauf, setSitzungsverlauf] = useState([]);

  const handleFileUpload = (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = parseCSV(e.target.result);
      if (type === 'tagesordnung') {
        const enrichedData = data.map(row => ({
          ...row,
          item_number: (row.item_number || "").replace(/\.0$/, "").trim(),
          title: (row.title || "").trim(),
          slug: slugify((row.item_number || "") + "-" + (row.title || "")),
          vertagt: false,
          uhrzeit: '',
          goAntraege: [],
          wahlen: [], 
          antraege: [] 
        }));
        setTagesordnung(enrichedData);
      } else {
        setAntraegeRaw(data);
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (tagesordnung.length > 0 && antraegeRaw.length > 0) {
      setTagesordnung(prevTo => prevTo.map(top => {
        const matchingAntraege = antraegeRaw.filter(a => 
          (a.Titel || "").trim() === top.title ||
          (a.TOP && String(a.TOP).trim() === String(top.item_number).trim()) ||
          (a.item_number && String(a.item_number).trim() === String(top.item_number).trim())
        ).map(a => ({
          ...a,
          Bezeichner: a.Bezeichner || '',
          Antragsteller: a['Antragsteller*in'] || '',
          Status: a.Status || '',
          Text: a.Text || '',
          Begründung: a.Begründung || '',
          abstimmung: null
        }));
        
        if (JSON.stringify(top.antraege) !== JSON.stringify(matchingAntraege) && top.antraege.length === 0) {
            return { ...top, antraege: matchingAntraege };
        }
        return top;
      }));
    }
  }, [antraegeRaw]); 

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

  const addWahl = (topIndex) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].wahlen.push({
      titel: '',
      kandidaten: [
        { name: '', fuer: {fs: 0, weight: 0}, gegen: {fs: 0, weight: 0}, enthaltung: {fs: 0, weight: 0} }
      ]
    });
    setTagesordnung(newTo);
  };

  const updateWahlTitel = (topIndex, wIndex, value) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].wahlen[wIndex].titel = value;
    setTagesordnung(newTo);
  };

  const removeWahl = (topIndex, wIndex) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].wahlen.splice(wIndex, 1);
    setTagesordnung(newTo);
  };

  const addKandidat = (topIndex, wIndex) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].wahlen[wIndex].kandidaten.push({
      name: '', fuer: {fs: 0, weight: 0}, gegen: {fs: 0, weight: 0}, enthaltung: {fs: 0, weight: 0}
    });
    setTagesordnung(newTo);
  };

  const updateKandidat = (topIndex, wIndex, kIndex, type, field, value) => {
    const newTo = [...tagesordnung];
    if (type === 'name') {
      newTo[topIndex].wahlen[wIndex].kandidaten[kIndex].name = value;
    } else {
      newTo[topIndex].wahlen[wIndex].kandidaten[kIndex][type][field] = Number(value) || 0;
    }
    setTagesordnung(newTo);
  };

  const removeKandidat = (topIndex, wIndex, kIndex) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].wahlen[wIndex].kandidaten.splice(kIndex, 1);
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

  const handlePrint = () => {
    window.print();
  };

  const formattedPrintDate = () => {
    if (!meta.datum) return "";
    try {
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
      
      {/* EDITOR ANSICHT */}
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

        {/* TOP 1 ANWESENHEIT */}
        {tagesordnung.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-200 border-l-4 border-l-emerald-600">
            <h2 className="text-xl font-bold text-emerald-800 mb-4">Anwesenheitsmatrix & Beschlussfähigkeit (Formalia)</h2>
            
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
                    }} className="flex-1 border border-gray-300 p-1 rounded text-sm" placeholder="z.B. FS 04 kommt nach." />
                    <button onClick={() => {
                      const newV = [...sitzungsverlauf]; newV.splice(i, 1); setSitzungsverlauf(newV);
                    }} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DYNAMISCHE TAGESORDNUNG */}
        {tagesordnung.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-gray-200 pb-2">Tagesordnungspunkte</h2>
            
            {tagesordnung.map((top, index) => {
              
              return (
              <div key={index} className={`bg-white rounded-xl shadow-sm border ${top.vertagt ? 'border-orange-300 opacity-75' : 'border-gray-200'} overflow-hidden`}>
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

                {!top.vertagt && (
                  <div className="p-4 space-y-6">
                    {top.antraege.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-bold text-emerald-800 border-b border-emerald-100 pb-1">Zugehörige Anträge</h4>
                        {top.antraege.map((antrag, aIndex) => (
                          <div key={aIndex} className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded-r-lg">
                            <div className="text-sm text-gray-800 mb-3 border-b border-emerald-200 pb-2">
                              <strong>Antrag {top.item_number}: {antrag.Bezeichner}</strong> | <strong>Einreichend:</strong> {antrag.Antragsteller} | <strong>Status:</strong> {antrag.Status}
                            </div>
                            
                            {antrag.Text && (
                              <div className="mb-3">
                                <strong className="text-xs text-emerald-700 uppercase">Antragstext / Beschlussfassung</strong>
                                <div className="text-sm mt-1 text-gray-600" dangerouslySetInnerHTML={{__html: antrag.Text.replace(/\n/g, '<br/>')}}></div>
                              </div>
                            )}

                            {antrag.Begründung && (
                              <div className="mb-4">
                                <strong className="text-xs text-emerald-700 uppercase">Begründung</strong>
                                <div className="text-sm mt-1 text-gray-600" dangerouslySetInnerHTML={{__html: antrag.Begründung.replace(/\n/g, '<br/>')}}></div>
                              </div>
                            )}
                            
                            {/* Abstimmungs-Editor */}
                            {!antrag.abstimmung ? (
                              <button 
                                onClick={() => initAbstimmung(index, aIndex)}
{/* ... existing code ... */}
                return (
                  <div className="antrag-box" key={aIdx}>
                      <div className="antrag-header">
                          Antrag {row.item_number}: {antrag.Bezeichner} | Einreichend: {antrag.Antragsteller} | Status: {antrag.Status}
                      </div>

                      {antrag.Text && (
                        <>
                          <h3>Antragstext / Beschlussfassung</h3>
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
{/* ... existing code ... */}