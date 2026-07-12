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

// Eigener, robuster CSV Parser für den Browser
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
        className="min-h-[42px] border border-gray-300 rounded-md p-2 flex flex-wrap gap-2 cursor-pointer bg-white text-base"
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
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto text-base">
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
    datum: '', 
    beginn: '18:15', 
    ende: '', 
    redeleitung: '', 
    protokoll: '', 
    anhang: '',
    raum: 'A120',
    ort: 'Geschwister-Scholl-Platz 1'
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
          antraege: [],
          showSitzungsverlauf: false, 
          sitzungsverlaufText: ''     
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

  const toggleSitzungsverlauf = (topIndex) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].showSitzungsverlauf = !newTo[topIndex].showSitzungsverlauf;
    setTagesordnung(newTo);
  };

  const updateSitzungsverlaufText = (topIndex, value) => {
    const newTo = [...tagesordnung];
    newTo[topIndex].sitzungsverlaufText = value;
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
    <div className="min-h-screen bg-gray-50 print:bg-white font-sans text-gray-800">
      
      {/* EDITOR ANSICHT */}
      <div className="print:hidden max-w-5xl mx-auto p-6 space-y-8">
        
        <div className="flex justify-between items-center bg-emerald-800 text-white p-6 rounded-xl shadow-lg">
          <div>
            <h1 className="text-3xl font-bold">Protokoll Generator</h1>
            <p className="text-emerald-100 mt-1 text-lg">Konvent der Fachschaften, LMU München</p>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum der Sitzung</label>
              <input type="date" value={meta.datum} onChange={e => setMeta({...meta, datum: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border text-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beginn (Uhrzeit)</label>
              <input type="time" value={meta.beginn} onChange={e => setMeta({...meta, beginn: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border text-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ende (Uhrzeit)</label>
              <input type="time" value={meta.ende} onChange={e => setMeta({...meta, ende: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border text-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Redeleitung</label>
              <input type="text" value={meta.redeleitung} onChange={e => setMeta({...meta, redeleitung: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border text-base" placeholder="Name 1, Name 2..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Protokollführung</label>
              <input type="text" value={meta.protokoll} onChange={e => setMeta({...meta, protokoll: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border text-base" placeholder="Name..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anhang (Optional)</label>
              <input type="text" value={meta.anhang} onChange={e => setMeta({...meta, anhang: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border text-base" placeholder="z.B. Präsentation TOP 4" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raum</label>
              <input type="text" value={meta.raum} onChange={e => setMeta({...meta, raum: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border text-base" placeholder="z.B. F007" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ort / Adresse</label>
              <input type="text" value={meta.ort} onChange={e => setMeta({...meta, ort: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm focus:border-emerald-500 p-2 border text-base" placeholder="z.B. Geschwister-Scholl-Platz 1" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">Tagesordnung (.csv)</label>
              <input type="file" accept=".csv" onChange={e => handleFileUpload(e, 'tagesordnung')} className="w-full text-base text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
            </div>
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">Anträge (.csv) <span className="font-normal text-gray-500">(Optional)</span></label>
              <input type="file" accept=".csv" onChange={e => handleFileUpload(e, 'antraege')} className="w-full text-base text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
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
                <div className="mt-2 text-base">
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
                  <label className="block text-base font-bold text-gray-700">Chronologischer Sitzungsverlauf (Mutationen)</label>
                  <button onClick={addSitzungsverlauf} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded flex items-center gap-1">
                    <Plus size={16} /> Eintrag
                  </button>
                </div>
                {sitzungsverlauf.map((v, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <input type="time" value={v.uhrzeit} onChange={e => {
                      const newV = [...sitzungsverlauf]; newV[i].uhrzeit = e.target.value; setSitzungsverlauf(newV);
                    }} className="w-32 border border-gray-300 p-2 rounded text-base" />
                    <input type="text" value={v.vermerk} onChange={e => {
                      const newV = [...sitzungsverlauf]; newV[i].vermerk = e.target.value; setSitzungsverlauf(newV);
                    }} className="flex-1 border border-gray-300 p-2 rounded text-base" placeholder="z.B. FS 04 kommt nach." />
                    <button onClick={() => {
                      const newV = [...sitzungsverlauf]; newV.splice(i, 1); setSitzungsverlauf(newV);
                    }} className="text-red-500 hover:text-red-700"><Trash2 size={20}/></button>
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
                  <h3 className="font-bold text-xl text-gray-800">
                    {top.item_number}: {top.title}
                  </h3>
                  
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

                {!top.vertagt && (
                  <div className="p-4 space-y-6">
                    
                    {/* FREITEXT SITZUNGSVERLAUF */}
                    {top.showSitzungsverlauf && (
                      <div className="bg-purple-50 border-l-4 border-purple-500 p-5 rounded-r-lg relative">
                        <button onClick={() => toggleSitzungsverlauf(index)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500"><Trash2 size={20}/></button>
                        <h4 className="font-bold text-purple-800 mb-3 text-base uppercase">Sitzungsverlauf / Protokoll</h4>
                        <textarea
                          value={top.sitzungsverlaufText}
                          onChange={e => updateSitzungsverlaufText(index, e.target.value)}
                          className="w-full border border-purple-200 rounded p-3 text-base min-h-[150px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Hier den Diskussionsverlauf, Wortmeldungen und inhaltliche Anmerkungen eintragen..."
                        />
                      </div>
                    )}

                    {top.antraege.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-bold text-emerald-800 text-lg border-b border-emerald-100 pb-1">Zugehörige Anträge</h4>
                        {top.antraege.map((antrag, aIndex) => (
                          <div key={aIndex} className="bg-emerald-50 border-l-4 border-emerald-600 p-5 rounded-r-lg">
                            <div className="text-base text-gray-800 mb-3 border-b border-emerald-200 pb-2">
                              <strong>Antrag {top.item_number}: {antrag.Bezeichner}</strong> | <strong>Einreichend:</strong> {antrag.Antragsteller} | <strong>Status:</strong> {antrag.Status}
                            </div>
                            
                            {antrag.Text && (
                              <div className="mb-3">
                                <strong className="text-sm text-emerald-700 uppercase">Antragstext / Beschlussfassung</strong>
                                <div className="text-base mt-1 text-gray-700" dangerouslySetInnerHTML={{__html: antrag.Text.replace(/\n/g, '<br/>')}}></div>
                              </div>
                            )}

                            {antrag.Begründung && (
                              <div className="mb-4">
                                <strong className="text-sm text-emerald-700 uppercase">Begründung</strong>
                                <div className="text-base mt-1 text-gray-700" dangerouslySetInnerHTML={{__html: antrag.Begründung.replace(/\n/g, '<br/>')}}></div>
                              </div>
                            )}
                            
                            {!antrag.abstimmung ? (
                              <button 
                                onClick={() => initAbstimmung(index, aIndex)}
                                className="mt-3 text-base bg-white border border-emerald-300 text-emerald-700 px-4 py-2 rounded hover:bg-emerald-100 font-medium"
                              >
                                + Abstimmungsergebnis erfassen
                              </button>
                            ) : (
                              <div className="mt-4 bg-white p-4 rounded border border-emerald-200">
                                <h5 className="text-base font-bold mb-3">Abstimmungsergebnis</h5>
                                <div className="grid grid-cols-4 gap-3 text-base text-center">
                                  <div></div><div className="font-bold text-gray-600">Dafür</div><div className="font-bold text-gray-600">Dagegen</div><div className="font-bold text-gray-600">Enthaltung</div>
                                  
                                  <div className="text-left font-medium flex items-center">Fachschaften</div>
                                  <input type="number" min="0" value={antrag.abstimmung.fuer.fs} onChange={e => updateAbstimmung(index, aIndex, 'fuer', 'fs', e.target.value)} className="border rounded p-2 text-center" />
                                  <input type="number" min="0" value={antrag.abstimmung.gegen.fs} onChange={e => updateAbstimmung(index, aIndex, 'gegen', 'fs', e.target.value)} className="border rounded p-2 text-center" />
                                  <input type="number" min="0" value={antrag.abstimmung.enthaltung.fs} onChange={e => updateAbstimmung(index, aIndex, 'enthaltung', 'fs', e.target.value)} className="border rounded p-2 text-center" />
                                  
                                  <div className="text-left font-medium flex items-center">Stimmgewichte</div>
                                  <input type="number" min="0" value={antrag.abstimmung.fuer.weight} onChange={e => updateAbstimmung(index, aIndex, 'fuer', 'weight', e.target.value)} className="border rounded p-2 text-center bg-gray-50" />
                                  <input type="number" min="0" value={antrag.abstimmung.gegen.weight} onChange={e => updateAbstimmung(index, aIndex, 'gegen', 'weight', e.target.value)} className="border rounded p-2 text-center bg-gray-50" />
                                  <input type="number" min="0" value={antrag.abstimmung.enthaltung.weight} onChange={e => updateAbstimmung(index, aIndex, 'enthaltung', 'weight', e.target.value)} className="border rounded p-2 text-center bg-gray-50" />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {top.wahlen && top.wahlen.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-bold text-blue-800 text-lg border-b border-blue-200 pb-1">Wahlen & Abstimmungen (ohne Antrag)</h4>
                        {top.wahlen.map((wahl, wIndex) => (
                          <div key={wIndex} className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-lg relative">
                            <button onClick={() => removeWahl(index, wIndex)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500"><Trash2 size={20}/></button>
                            
                            <div className="mb-4">
                              <label className="block text-sm font-bold text-blue-700 uppercase mb-1">Titel der Wahl</label>
                              <input 
                                type="text" 
                                value={wahl.titel} 
                                onChange={e => updateWahlTitel(index, wIndex, e.target.value)} 
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
                                {wahl.kandidaten.map((k, kIndex) => (
                                  <tr key={kIndex} className="border-b border-blue-100 last:border-0">
                                    <td className="p-1">
                                      <input type="text" value={k.name} onChange={e => updateKandidat(index, wIndex, kIndex, 'name', null, e.target.value)} className="w-full border-gray-300 rounded p-2" placeholder="Name..." />
                                    </td>
                                    <td className="p-1">
                                      <div className="flex gap-1 justify-center">
                                        <input type="number" min="0" value={k.fuer.fs} onChange={e => updateKandidat(index, wIndex, kIndex, 'fuer', 'fs', e.target.value)} className="w-14 border-gray-300 rounded p-2 text-center" title="Fachschaften" />
                                        <input type="number" min="0" value={k.fuer.weight} onChange={e => updateKandidat(index, wIndex, kIndex, 'fuer', 'weight', e.target.value)} className="w-16 border-gray-300 rounded p-2 text-center bg-gray-50" title="Stimmgewichte" />
                                      </div>
                                    </td>
                                    <td className="p-1">
                                      <div className="flex gap-1 justify-center">
                                        <input type="number" min="0" value={k.gegen.fs} onChange={e => updateKandidat(index, wIndex, kIndex, 'gegen', 'fs', e.target.value)} className="w-14 border-gray-300 rounded p-2 text-center" title="Fachschaften" />
                                        <input type="number" min="0" value={k.gegen.weight} onChange={e => updateKandidat(index, wIndex, kIndex, 'gegen', 'weight', e.target.value)} className="w-16 border-gray-300 rounded p-2 text-center bg-gray-50" title="Stimmgewichte" />
                                      </div>
                                    </td>
                                    <td className="p-1">
                                      <div className="flex gap-1 justify-center">
                                        <input type="number" min="0" value={k.enthaltung.fs} onChange={e => updateKandidat(index, wIndex, kIndex, 'enthaltung', 'fs', e.target.value)} className="w-14 border-gray-300 rounded p-2 text-center" title="Fachschaften" />
                                        <input type="number" min="0" value={k.enthaltung.weight} onChange={e => updateKandidat(index, wIndex, kIndex, 'enthaltung', 'weight', e.target.value)} className="w-16 border-gray-300 rounded p-2 text-center bg-gray-50" title="Stimmgewichte" />
                                      </div>
                                    </td>
                                    <td className="p-1 text-center">
                                      <button onClick={() => removeKandidat(index, wIndex, kIndex)} className="text-red-400 hover:text-red-600"><Trash2 size={20}/></button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            
                            <button 
                              onClick={() => addKandidat(index, wIndex)}
                              className="text-sm font-medium bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-100"
                            >
                              + Kandidat*in / Option hinzufügen
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-4">
                      {top.goAntraege.map((go, goIndex) => (
                        <div key={goIndex} className="bg-orange-50 border-l-4 border-orange-500 p-5 rounded-r-lg relative">
                          <button onClick={() => removeGOAntrag(index, goIndex)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500"><Trash2 size={20}/></button>
                          <h4 className="font-bold text-orange-800 mb-3 text-base uppercase">GO-Antrag</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
                            <div><label className="block text-xs text-gray-500 uppercase font-bold">Einreichend</label><input type="text" value={go.einreichend} onChange={e => updateGOAntrag(index, goIndex, 'einreichend', e.target.value)} className="w-full border-gray-300 rounded p-2 mt-1" /></div>
                            <div><label className="block text-xs text-gray-500 uppercase font-bold">Uhrzeit</label><input type="time" value={go.uhrzeit} onChange={e => updateGOAntrag(index, goIndex, 'uhrzeit', e.target.value)} className="w-full border-gray-300 rounded p-2 mt-1" /></div>
                            <div className="md:col-span-2"><label className="block text-xs text-gray-500 uppercase font-bold">Antrag (Inhalt)</label><input type="text" value={go.antrag} onChange={e => updateGOAntrag(index, goIndex, 'antrag', e.target.value)} className="w-full border-gray-300 rounded p-2 mt-1" placeholder="z.B. Schluss der Debatte" /></div>
                            <div><label className="block text-xs text-gray-500 uppercase font-bold">Gegenrede</label><input type="text" value={go.gegenrede} onChange={e => updateGOAntrag(index, goIndex, 'gegenrede', e.target.value)} className="w-full border-gray-300 rounded p-2 mt-1" placeholder="Name oder 'Keine'" /></div>
                            <div><label className="block text-xs text-gray-500 uppercase font-bold">Ergebnis</label><input type="text" value={go.ergebnis} onChange={e => updateGOAntrag(index, goIndex, 'ergebnis', e.target.value)} className="w-full border-gray-300 rounded p-2 mt-1" placeholder="z.B. 15/2/3 oder Angenommen" /></div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-200">
                        {!top.showSitzungsverlauf && (
                          <button 
                            onClick={() => toggleSitzungsverlauf(index)}
                            className="flex items-center gap-2 text-base bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 px-4 py-2 rounded font-bold transition"
                          >
                            <Plus size={18} /> Sitzungsverlauf erfassen
                          </button>
                        )}
                        <button 
                          onClick={() => addGOAntrag(index)}
                          className="flex items-center gap-2 text-base bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-700 px-4 py-2 rounded font-bold transition"
                        >
                          <Plus size={18} /> GO-Antrag
                        </button>
                        <button 
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
            )})}
          </div>
        )}
      </div>

      {/* DRUCK ANSICHT */}
      <div className="hidden print:block text-black min-h-screen">
        <style dangerouslySetInnerHTML={{__html: `
          /* DIE LÖSUNG: Fluid Print Layout */
          /* Ränder werden NATIV dem Browser übergeben, anstatt feste Pixel-Boxen zu simulieren */
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
          
          /* Grundlegende Restriktionen zur Verhinderung von horizontalem Overflow */
          * { 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
              box-sizing: border-box !important;
              max-width: 100% !important; 
          }
          
          /* Explizites Erzwingen eines weißen Hintergrunds für alle übergeordneten Druck-Container */
          html, body, .hidden.print\\:block { 
              background-color: #ffffff !important; 
              width: 100% !important; /* Relatives Skalieren statt fixer Millimeter */
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
              justify-content: center; /* Vertikale Zentrierung */
              align-items: center;     /* Horizontale Zentrierung */
              text-align: center; 
              position: relative; 
              width: 100%;
              height: 250mm; /* Fixe Höhe, um die exakte optische Mitte des A4-Blattes zu definieren */
              page-break-after: always; 
              background-color: transparent !important;
              z-index: 10;
          }

          .cover-seal {
              position: absolute;
              top: 50%; /* Auf exakt 50% zentriert für feste optische Platzierung */
              left: 50%;
              transform: translate(-50%, -50%);
              width: 100%;
              max-width: 600px; /* Zusätzlicher Schutz für große Siegel-Bilder */
              opacity: 0.20; /* Opake, fixe Grafik explizit nur für Seite 1 */
              z-index: -1;
              pointer-events: none;
          }

          .print-layout-table {
              width: 100%;
              max-width: 100%;
              border: none !important;
              margin: 0 !important;
              table-layout: fixed; /* LÖSUNG: Zwingt die Haupttabelle, sich an die 100% zu halten */
          }
          .print-layout-table > thead {
              display: table-header-group; /* Wiederholt den Header automatisch auf jeder neuen Seite der Tabelle */
          }
          .print-layout-table > tbody {
              display: table-row-group;
          }
          .print-layout-table > thead > tr > td,
          .print-layout-table > tbody > tr > td {
              border: none !important;
              padding: 0 !important;
              background: transparent !important;
              width: 100%; /* WICHTIG für das Fixed-Layout */
              overflow-wrap: break-word !important; 
          }
          
          .institution { font-size: 18pt; font-weight: bold; color: #005030; margin-bottom: 10mm; text-transform: uppercase; letter-spacing: 1px; }
          .title { font-size: 26pt; font-weight: bold; margin-bottom: 5mm; color: #000000; }
          .subtitle { font-size: 18pt; color: #000000; margin-bottom: 20mm; font-weight: 500; }
          .event-details { font-size: 14pt; color: #000000; margin-bottom: 3mm; line-height: 1.6; font-weight: 500; }

          h1 { font-size: 18pt; color: #005030; border-bottom: 2px solid #005030; padding-bottom: 5px; margin-top: 0; page-break-after: avoid; margin-bottom: 20px;}
          h2 { font-size: 15pt; margin-top: 25px; margin-bottom: 10px; page-break-after: avoid; }
          h3 { font-size: 12pt; text-transform: uppercase; color: #666666; margin-top: 15px; margin-bottom: 5px; page-break-after: avoid; }

          /* Aggressives Text-Wrapping für Freitexte (verhindert das Ausbrechen von URLs) */
          .item-text { 
              margin-bottom: 15px; 
              text-align: justify; 
              hyphens: auto;
              overflow-wrap: anywhere !important; 
              word-break: break-word !important; 
          }
          
          /* Schutz für injizierte HTML-Inhalte aus der CSV */
          .item-text img, .antrag-box img { max-width: 100% !important; height: auto !important; }
          .item-text pre, .item-text code { white-space: pre-wrap !important; word-wrap: break-word !important; }

          .antrag-box { background-color: #f4f7f6; border-left: 5px solid #005030; padding: 15px 20px; margin-top: 15px; margin-bottom: 20px; page-break-inside: avoid; }
          .antrag-header { font-weight: bold; font-size: 11pt; color: #005030; border-bottom: 1px solid #d0ded8; padding-bottom: 8px; margin-bottom: 12px; }

          .wahl-box { background-color: #f0f9ff; border-left: 5px solid #0284c7; padding: 15px 20px; margin-top: 15px; margin-bottom: 20px; page-break-inside: avoid; }
          .wahl-header { font-weight: bold; font-size: 11pt; color: #0284c7; border-bottom: 1px solid #bae6fd; padding-bottom: 8px; margin-bottom: 12px; }

          .go-box { background-color: #fff3e0; border-left: 5px solid #ff9800; padding: 12px 18px; margin-top: 10px; margin-bottom: 20px; page-break-inside: avoid; }
          .go-header { font-weight: bold; font-size: 11pt; color: #e65100; border-bottom: 1px solid #ffe0b2; padding-bottom: 6px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          .go-content { font-size: 11pt; line-height: 1.5; margin-bottom: 6px; }

          table.data-table { 
              width: 100%; 
              max-width: 100%;
              border-collapse: collapse; 
              margin-bottom: 30px; 
              page-break-inside: avoid; 
              table-layout: fixed; /* ZWINGEND: Verhindert, dass Tabelleninhalte die Spaltenbreite sprengen */
          }
          
          /* Aggressives Text-Wrapping für Tabellenzellen (verhindert URL-Overflow) */
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

          .page-break { page-break-before: always; }
        `}} />

        {/* --- FLUID BODY --- */}
        {/* DECKBLATT (Seite 1) */}
        <div className="cover-page">
            <img src="Siegel.png" className="cover-seal" alt="LMU Siegel" />
            
            <div className="institution">Konvent der Fachschaften<br/>Ludwig-Maximilians-Universität München</div>
            <div className="title">Sitzungsprotokoll</div>
            <div className="subtitle">Sitzung am {formattedPrintDate()}</div>
            <div className="event-details">Ab {meta.beginn} Uhr c.t. in {meta.raum}</div>
            <div className="event-details">{meta.ort}</div>
            <div style={{fontSize: '14pt', marginTop: '15mm', color: '#000000', fontWeight: '500'}}><strong>Stand:</strong> {new Date().toLocaleDateString('de-DE')}</div>
        </div>

        {/* HAUPTDOKUMENT (ab Seite 2) */}
        <table className="print-layout-table">
          <thead>
            <tr>
              <td style={{ border: 'none', padding: 0 }}>
                {/* Print Header, der durch table-header-group exakt ab Seite 2 auf jeder Seite wiederholt wird */}
                <div style={{ paddingBottom: '2px' }}>
                  <table style={{ width: '100%', borderBottom: '1px solid #ddd', marginBottom: '8px', paddingBottom: '4px', tableLayout: 'fixed' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '50%', textAlign: 'left', border: 'none', padding: 0 }}>
                          <img src="Stuve Logo lang.png" alt="StuVe Logo" style={{ height: '30px' }} />
                        </td>
                        <td style={{ width: '50%', textAlign: 'right', verticalAlign: 'bottom', border: 'none', padding: 0, color: '#777', fontSize: '10pt', whiteSpace: 'nowrap', paddingBottom: '2px' }}>
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
            <tr>
              <td style={{ border: 'none', padding: 0, paddingBottom: '30px' }}>
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

                  <h2 style={{marginTop: '40px'}}>Inhaltsverzeichnis</h2>
                  <ul className="toc-list">
                      {tagesordnung.map((row, i) => {
                          const targetId = `top-${row.slug}`;
                          return (
                            <li key={i} className="toc-item">
                              <a href={`#${targetId}`} className="toc-link">{row.item_number}: {row.title}</a>
                              {row.vertagt && <em style={{color: '#e65100', marginLeft: '8px', fontWeight:'normal'}}>(Vertagt)</em>}
                              <div className="toc-dots"></div>
                            </li>
                          );
                      })}
                  </ul>

                  <div className="page-break"></div>

                  <h1>Tagesordnung und Protokoll</h1>
              </td>
            </tr>

            {tagesordnung.map((row, index) => {
              const topNumStr = String(row.item_number).trim();
              const targetId = `top-${row.slug}`;
              
              return (
                <tr key={index}>
                  <td style={{ border: 'none', padding: 0, paddingBottom: '30px' }}>
                    <h2 id={targetId}>
                      {topNumStr}: {row.title}
                      {row.vertagt && <span style={{color: '#e65100', marginLeft: '10px'}}> [Vertagt]</span>}
                      {!row.vertagt && isHauptTop(topNumStr) && row.uhrzeit && (
                        <span style={{fontSize: '12pt', color: '#555', fontWeight: 'normal', marginLeft: '10px'}}>
                          (ab {row.uhrzeit} Uhr)
                        </span>
                      )}
                    </h2>

                    {index === 0 && !row.vertagt && (
                      <>
                        <h3 style={{color: '#005030'}}>Anwesenheitsliste</h3>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th width="35%"></th>
                                    <th width="65%">Fachschaften</th>
                                </tr>
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

                    {!row.vertagt && row.text && (
                        <div className="item-text" dangerouslySetInnerHTML={{__html: row.text.replace(/\n/g, '<br/>')}}></div>
                    )}

                    {!row.vertagt && row.showSitzungsverlauf && row.sitzungsverlaufText && (
                        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                            <h3 style={{color: '#005030'}}>Sitzungsverlauf</h3>
                            <div className="item-text" dangerouslySetInnerHTML={{__html: row.sitzungsverlaufText.replace(/\n/g, '<br/>')}}></div>
                        </div>
                    )}

                    {!row.vertagt && row.antraege && row.antraege.map((antrag, aIdx) => {
                      
                      let totalFs = 0, totalW = 0;
                      if (antrag.abstimmung) {
                        totalFs = antrag.abstimmung.fuer.fs + antrag.abstimmung.gegen.fs + antrag.abstimmung.enthaltung.fs;
                        totalW = antrag.abstimmung.fuer.weight + antrag.abstimmung.gegen.weight + antrag.abstimmung.enthaltung.weight;
                      }

                      return (
                        <div className="antrag-box" key={aIdx}>
                            <div className="antrag-header">
                                Antrag {topNumStr}: {antrag.Bezeichner} | Einreichend: {antrag.Antragsteller} | Status: {antrag.Status}
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

                    {!row.vertagt && row.wahlen && row.wahlen.length > 0 && (
                      <>
                        {row.wahlen.map((wahl, wIdx) => (
                          <div className="wahl-box" key={wIdx}>
                            <div className="wahl-header">Wahlergebnis: {wahl.titel}</div>
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th width="25%">Kandidat*in / Option</th>
                                  <th width="25%">Fürstimmen<br/><small>(FS / Gewichte)</small></th>
                                  <th width="25%">Gegenstimmen<br/><small>(FS / Gewichte)</small></th>
                                  <th width="25%">Enthaltungen<br/><small>(FS / Gewichte)</small></th>
                                </tr>
                              </thead>
                              <tbody>
                                {wahl.kandidaten.map((k, kIdx) => (
                                  <tr key={kIdx}>
                                    <td><strong>{k.name}</strong></td>
                                    <td>{k.fuer.fs} / {k.fuer.weight}</td>
                                    <td>{k.gegen.fs} / {k.gegen.weight}</td>
                                    <td>{k.enthaltung.fs} / {k.enthaltung.weight}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </>
                    )}

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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}