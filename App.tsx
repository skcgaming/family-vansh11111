
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { NEPALI_STRINGS } from './constants';
import { Member, Relation, RelationType } from './types';
import ArchitectureDocs from './components/ArchitectureDocs';
import TreeVisualizer from './components/TreeVisualizer';
import { RelationshipEngine } from './services/RelationshipEngine';

const KINSHIP_OPTIONS = [
  { label: 'बुबा/आमा (Parent)', type: RelationType.PARENT, genDiff: -1, isChildOf: true, category: 'प्रत्यक्ष' },
  { label: 'छोरा/छोरी (Child)', type: RelationType.PARENT, genDiff: 1, isChildOf: false, category: 'प्रत्यक्ष' },
  { label: 'दाजु/भाइ/दिदी/बहिनी (Sibling)', type: 'SIBLING', genDiff: 0, category: 'दाजुभाइ/दिदीबहिनी' },
  { label: 'बाजे/बज्यै (Grandparent)', type: RelationType.PARENT, genDiff: -2, isChildOf: true, category: 'बाजेबज्यै' },
  { label: 'नाति/नातिनी (Grandchild)', type: RelationType.PARENT, genDiff: 2, isChildOf: false, category: 'बाजेबज्यै' },
  { label: 'श्रीमती/श्रीमान (Spouse)', type: RelationType.SPOUSE, genDiff: 0, category: 'ससुराली तर्फ' },
  { label: 'ससुरा/सासू (In-laws)', type: RelationType.PARENT, genDiff: -1, isChildOf: true, category: 'ससुराली तर्फ' },
  { label: 'जेठान/सालो/साली (Spouse Sibling)', type: 'SPOUSE_SIBLING', genDiff: 0, category: 'ससुराली तर्फ' },
  { label: 'काका/काकी/फुपू (Uncle/Aunt Paternal)', type: 'UNCLE_AUNT', genDiff: -1, category: 'काका-मामा खलक' },
  { label: 'मामा/माइजु (Maternal Uncle/Aunt)', type: 'UNCLE_AUNT_MATERNAL', genDiff: -1, category: 'काका-मामा खलक' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tree' | 'docs' | 'logic' | 'stats'>('tree');
  const [members, setMembers] = useState<Member[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Partial<Member & { birthDate?: string, isDeceased?: boolean, bio?: string }> | null>(null);
  const [relToMemberId, setRelToMemberId] = useState<string>('');
  const [relTypeIndex, setRelTypeIndex] = useState<number>(0);
  const [memberA, setMemberA] = useState<string>('');
  const [memberB, setMemberB] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- OFFLINE PERSISTENCE LOGIC ---
  useEffect(() => {
    const savedMembers = localStorage.getItem('mb_members');
    const savedRelations = localStorage.getItem('mb_relations');
    
    if (savedMembers && savedRelations) {
      const m = JSON.parse(savedMembers);
      setMembers(m);
      setRelations(JSON.parse(savedRelations));
      if (m.length > 0) {
        setRelToMemberId(m[0].id);
        setMemberA(m[0].id);
        setMemberB(m[0].id);
      }
    } else {
      // Default Initial Data
      const initM: Member[] = [
        { id: '1', name: 'राम बहादुर', address: 'काठमाडौं', phone: '9841000000', generationLevel: 0, gender: 'MALE', photoUri: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ram' },
        { id: '2', name: 'सीता देवी', address: 'काठमाडौं', phone: '9841000001', generationLevel: 0, gender: 'FEMALE', photoUri: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sita' }
      ];
      const initR: Relation[] = [{ id: 'r1', fromId: '1', toId: '2', type: RelationType.SPOUSE }];
      setMembers(initM);
      setRelations(initR);
      setRelToMemberId('1');
      setMemberA('1');
      setMemberB('2');
    }
  }, []);

  useEffect(() => {
    if (members.length > 0) {
      localStorage.setItem('mb_members', JSON.stringify(members));
      localStorage.setItem('mb_relations', JSON.stringify(relations));
    }
  }, [members, relations]);

  const engine = useMemo(() => new RelationshipEngine(members, relations), [members, relations]);
  const calculatedRelation = useMemo(() => engine.findRelationship(memberA, memberB), [memberA, memberB, engine]);

  const filteredMembers = useMemo(() => 
    members.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())), 
    [members, searchQuery]
  );

  const stats = useMemo(() => ({
    total: members.length,
    male: members.filter(m => m.gender === 'MALE').length,
    female: members.filter(m => m.gender === 'FEMALE').length,
    gens: new Set(members.map(m => m.generationLevel)).size
  }), [members]);

  const handleExport = () => {
    const data = JSON.stringify({ members, relations });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `banshawali_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.members && parsed.relations) {
          setMembers(parsed.members);
          setRelations(parsed.relations);
          alert("Data successfully imported!");
        }
      } catch (err) {
        alert("Invalid file format.");
      }
    };
    reader.readAsText(file);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingMember(prev => ({ ...prev, photoUri: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember?.name) return;

    if (editingMember.id) {
      setMembers(prev => prev.map(m => m.id === editingMember.id ? (editingMember as Member) : m));
    } else {
      const newId = Date.now().toString();
      const relOption = KINSHIP_OPTIONS[relTypeIndex];
      const baseMember = members.find(m => m.id === relToMemberId);
      const calculatedGen = (baseMember?.generationLevel ?? 0) + (relOption?.genDiff ?? 0);

      const newMember: Member = {
        ...editingMember,
        id: newId,
        generationLevel: calculatedGen,
        name: editingMember.name ?? '',
        address: editingMember.address ?? '',
        phone: editingMember.phone ?? '',
        gender: editingMember.gender ?? 'MALE',
        photoUri: editingMember.photoUri || `https://api.dicebear.com/7.x/avataaars/svg?seed=${editingMember.name}`
      } as Member;

      setMembers(prev => [...prev, newMember]);

      if (relOption.type === RelationType.PARENT) {
        const from = relOption.isChildOf ? newId : relToMemberId;
        const to = relOption.isChildOf ? relToMemberId : newId;
        setRelations(prev => [...prev, { id: `r_${Date.now()}`, fromId: from, toId: to, type: RelationType.PARENT }]);
      } else if (relOption.type === RelationType.SPOUSE) {
        setRelations(prev => [...prev, { id: `r_${Date.now()}`, fromId: relToMemberId, toId: newId, type: RelationType.SPOUSE }]);
      }
    }
    setIsModalOpen(false);
    setEditingMember(null);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto shadow-2xl bg-white relative pb-24">
      <header className="bg-indigo-700 text-white p-6 sticky top-0 z-40 shadow-lg">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{NEPALI_STRINGS.app_title}</h1>
          <div className="flex gap-2">
            <button onClick={handleExport} title="Backup" className="p-2 bg-indigo-600 rounded-lg hover:bg-indigo-500">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            </button>
            <label className="p-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 cursor-pointer">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
               <input type="file" className="hidden" accept=".json" onChange={handleImport} />
            </label>
          </div>
        </div>
      </header>

      <div className="flex border-b bg-white sticky top-[76px] z-30 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('tree')} className={`flex-1 min-w-[100px] py-4 text-center font-bold transition-all ${activeTab === 'tree' ? 'border-b-4 border-indigo-600 text-indigo-700 bg-indigo-50' : 'text-gray-500'}`}> वृक्ष </button>
        <button onClick={() => setActiveTab('logic')} className={`flex-1 min-w-[100px] py-4 text-center font-bold transition-all ${activeTab === 'logic' ? 'border-b-4 border-indigo-600 text-indigo-700 bg-indigo-50' : 'text-gray-500'}`}> नाता </button>
        <button onClick={() => setActiveTab('stats')} className={`flex-1 min-w-[100px] py-4 text-center font-bold transition-all ${activeTab === 'stats' ? 'border-b-4 border-indigo-600 text-indigo-700 bg-indigo-50' : 'text-gray-500'}`}> तथ्याङ्क </button>
        <button onClick={() => setActiveTab('docs')} className={`flex-1 min-w-[100px] py-4 text-center font-bold transition-all ${activeTab === 'docs' ? 'border-b-4 border-indigo-600 text-indigo-700 bg-indigo-50' : 'text-gray-500'}`}> इन्फो </button>
      </div>

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'tree' && (
          <div className="p-4 space-y-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="नाम खोज्नुहोस्..." 
                className="w-full p-4 pl-12 bg-gray-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg className="w-5 h-5 absolute left-4 top-4.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>

            <TreeVisualizer members={members} relations={relations} onNodeClick={(id) => { setEditingMember(members.find(m => m.id === id) || null); setIsModalOpen(true); }} />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {filteredMembers.map(member => (
                <div key={member.id} className="flex items-center p-4 border rounded-2xl bg-white shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer" onClick={() => { setEditingMember(member); setIsModalOpen(true); }}>
                  <img src={member.photoUri} alt={member.name} className="w-12 h-12 rounded-full mr-4 object-cover ring-2 ring-gray-100" />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 leading-tight">{member.name}</h4>
                    <p className="text-xs text-gray-400">{member.generationLevel} पुस्ता • {member.address || 'ठेगाना छैन'}</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${member.gender === 'MALE' ? 'bg-blue-400' : 'bg-pink-400'}`}></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'logic' && (
          <div className="p-6 space-y-6">
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">🔍 नाता क्यालकुलेटर</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-indigo-400 block mb-1">पहिलो व्यक्ति</label>
                  <select value={memberA} onChange={(e) => setMemberA(e.target.value)} className="w-full p-4 border rounded-2xl bg-white shadow-sm outline-none">
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-center -my-2 relative z-10">
                  <div className="bg-white p-2 rounded-full shadow-md border text-indigo-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-indigo-400 block mb-1">दोस्रो व्यक्ति</label>
                  <select value={memberB} onChange={(e) => setMemberB(e.target.value)} className="w-full p-4 border rounded-2xl bg-white shadow-sm outline-none">
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-8 text-center bg-indigo-600 text-white py-12 rounded-3xl shadow-2xl transform hover:scale-102 transition-transform">
                <p className="text-[10px] uppercase tracking-widest opacity-80 mb-2">गणना गरिएको नाता (Relationship)</p>
                <h3 className="text-4xl font-black">{calculatedRelation}</h3>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="p-6 space-y-6">
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-6 rounded-3xl border shadow-sm text-center">
                 <p className="text-sm text-gray-400 mb-1">कुल सदस्य</p>
                 <h2 className="text-4xl font-black text-indigo-600">{stats.total}</h2>
               </div>
               <div className="bg-white p-6 rounded-3xl border shadow-sm text-center">
                 <p className="text-sm text-gray-400 mb-1">कुल पुस्ता</p>
                 <h2 className="text-4xl font-black text-green-600">{stats.gens}</h2>
               </div>
               <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 text-center">
                 <p className="text-sm text-blue-400 mb-1">पुरुष</p>
                 <h2 className="text-4xl font-black text-blue-600">{stats.male}</h2>
               </div>
               <div className="bg-pink-50 p-6 rounded-3xl border border-pink-100 text-center">
                 <p className="text-sm text-pink-400 mb-1">महिला</p>
                 <h2 className="text-4xl font-black text-pink-600">{stats.female}</h2>
               </div>
             </div>
             
             <div className="bg-gray-50 p-6 rounded-3xl border border-dashed border-gray-300">
                <h3 className="font-bold mb-4">बंशावली अपडेटहरू</h3>
                <p className="text-sm text-gray-500 italic">तपाईंको डेटा तपाईंको मोबाइलमा सुरक्षित रूपमा स्टोर गरिएको छ। ब्याकअपका लागि 'निर्यात' (Export) विकल्प प्रयोग गर्नुहोस्।</p>
             </div>
          </div>
        )}

        {activeTab === 'docs' && <ArchitectureDocs />}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-indigo-700 p-5 text-white flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold">{editingMember?.id ? 'सदस्य सम्पादन' : 'नयाँ सदस्य थप्नुहोस्'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-2xl">✕</button>
            </div>
            
            <form onSubmit={handleSaveMember} className="p-6 space-y-6 overflow-y-auto no-scrollbar">
              <div className="flex flex-col items-center">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <img src={editingMember?.photoUri || 'https://api.dicebear.com/7.x/avataaars/svg?seed=placeholder'} className="w-32 h-32 rounded-full border-4 border-indigo-50 object-cover shadow-xl" />
                  <div className="absolute bottom-0 right-0 bg-indigo-600 p-2 rounded-full text-white shadow-lg border-2 border-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">पूरा नाम *</label>
                  <input required value={editingMember?.name || ''} onChange={e => setEditingMember(p => ({...p, name: e.target.value}))} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500" placeholder="उदा: राम बहादुर थापा" />
                </div>

                {!editingMember?.id && (
                  <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100">
                    <label className="text-xs font-bold text-indigo-600 uppercase mb-3 block">सम्बन्ध विवरण</label>
                    <div className="grid grid-cols-1 gap-4">
                      <select value={relToMemberId} onChange={e => setRelToMemberId(e.target.value)} className="w-full p-3 bg-white border rounded-xl">
                        {members.map(m => <option key={m.id} value={m.id}>{m.name} संगको...</option>)}
                      </select>
                      <div className="flex flex-wrap gap-2">
                        {KINSHIP_OPTIONS.map((opt, idx) => (
                          <button key={idx} type="button" onClick={() => setRelTypeIndex(idx)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${relTypeIndex === idx ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-500'}`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">लिङ्ग</label>
                    <select value={editingMember?.gender || 'MALE'} onChange={e => setEditingMember(p => ({...p, gender: e.target.value as any}))} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none">
                      <option value="MALE">पुरुष</option>
                      <option value="FEMALE">महिला</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">फोन नम्बर</label>
                    <input type="tel" value={editingMember?.phone || ''} onChange={e => setEditingMember(p => ({...p, phone: e.target.value}))} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">ठेगाना</label>
                  <input value={editingMember?.address || ''} onChange={e => setEditingMember(p => ({...p, address: e.target.value}))} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none" />
                </div>
              </div>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white pb-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-gray-500 rounded-2xl bg-gray-100">रद्द</button>
                <button type="submit" className="flex-1 py-4 font-bold text-white rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-200">सुरक्षित गर्नुहोस्</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 w-full max-w-4xl bg-white/95 backdrop-blur-md border-t p-4 flex gap-4 z-50">
        <button onClick={() => { setEditingMember({}); setIsModalOpen(true); }} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-transform">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
          नयाँ सदस्य थप्नुहोस्
        </button>
      </footer>
    </div>
  );
};

export default App;
