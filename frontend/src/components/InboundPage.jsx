import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Save, Trash2, Package, X, ChevronRight } from 'lucide-react'

const API_BASE = 'http://127.0.0.1:8000'

function InboundPage() {
  const [lots, setLots] = useState([])
  const [baits, setBaits] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [showLotForm, setShowLotForm] = useState(false)
  const [selectedLot, setSelectedLot] = useState(null)
  
  // Lot Form State
  const [newLot, setNewLot] = useState({
    status: 'Arrived'
  })

  const emptyItem = () => ({ 
    bait_id: '', 
    spec_id: '', 
    warehouse_id: '', 
    initial_quantity: '', 
    kg_per_box: 10.0,
    unit_price_usd: '', 
    unit_price_krw: '', 
    _specs: [],
    _isManualSpec: false
  })
  const [itemList, setItemList] = useState([emptyItem()])
  // Separate state for the 'add item to existing lot' form
  const [itemForm, setItemForm] = useState({ 
    bait_id: '', 
    spec_id: '', 
    warehouse_id: '', 
    initial_quantity: '', 
    kg_per_box: 10.0,
    unit_price_usd: '', 
    unit_price_krw: '',
    warehouse_mgmt_no: '',
    _isManualSpec: false
  })
  const [itemFormSpecs, setItemFormSpecs] = useState([]) // specs for itemForm dropdown
  const [allSpecs, setAllSpecs] = useState([])
  const [lotItems, setLotItems] = useState([])
  const [allInventory, setAllInventory] = useState([])
  const [showManualOrigin, setShowManualOrigin] = useState(false)

  const countries = ["인도네시아", "중국", "멕시코"]

  useEffect(() => {
    fetchMasterData()
    fetchLots()
    fetchAllInventory()
  }, [])

  const fetchMasterData = async () => {
    try {
      const [bRes, wRes, sRes] = await Promise.all([
        axios.get(`${API_BASE}/master/baits`),
        axios.get(`${API_BASE}/master/warehouses`),
        axios.get(`${API_BASE}/master/bait_specs`)
      ])
      setBaits(bRes.data)
      setWarehouses(wRes.data)
      setAllSpecs(sRes.data)
    } catch (err) {
      console.error("Master data fetch error", err)
    }
  }

  const fetchLots = async () => {
    try {
      const res = await axios.get(`${API_BASE}/lots`)
      setLots(res.data)
    } catch (err) {
      console.error("Lot fetch error", err)
    }
  }

  const fetchSpecs = async (baitId, rowIndex) => {
    if (!baitId) return
    try {
      const res = await axios.get(`${API_BASE}/master/specs/${baitId}`)
      setItemList(prev => prev.map((item, i) => i === rowIndex ? { ...item, _specs: res.data } : item))
    } catch (err) {
      console.error("Spec fetch error", err)
    }
  }

  const fetchItemFormSpecs = async (baitId) => {
    if (!baitId) return
    try {
      const res = await axios.get(`${API_BASE}/master/specs/${baitId}`)
      setItemFormSpecs(res.data)
    } catch (err) {
      console.error("Spec fetch error", err)
    }
  }

  const updateItem = (index, field, value) => {
    setItemList(prev => prev.map((item, i) => {
      if (i === index) {
        let updated = { ...item, [field]: value }
        
        // Auto weight based on product
        if (field === 'bait_id' && value) {
          const selectedBait = baits.find(b => b.id === parseInt(value))
          if (selectedBait) {
            let weight = 10.0
            if (selectedBait.name.includes('정어리') && selectedBait.origin.includes('멕시코')) weight = 15.0
            else if (selectedBait.name.includes('오징어')) weight = 20.0
            updated.kg_per_box = weight
          }
        }
        return updated
      }
      return item
    }))
  }

  const addItemRow = () => setItemList(prev => [...prev, emptyItem()])

  const removeItemRow = (index) => {
    if (itemList.length === 1) return // keep at least one row
    setItemList(prev => prev.filter((_, i) => i !== index))
  }

  const fetchAllInventory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/inventory`)
      setAllInventory(res.data)
    } catch (err) {
      console.error("All inventory fetch error", err)
    }
  }

  const fetchLotItems = async (lotId) => {
    try {
      const res = await axios.get(`${API_BASE}/inventory`)
      const filtered = res.data.filter(item => item.lot_id === lotId)
      setLotItems(filtered)
      setAllInventory(res.data) // also update allInventory for totals
    } catch (err) {
      console.error("Lot items fetch error", err)
      alert("품목 목록을 불러오지 못했습니다: " + (err.response?.data?.detail || err.message))
    }
  }

  const handleCreateLotWithItem = async () => {
    if (!newLot.id) return alert("BL 번호는 필수입니다.")
    try {
      const sanitizedLot = {
        ...newLot,
        etd: newLot.etd || null,
        eta: newLot.eta || null,
        inbound_date: newLot.inbound_date || null,
      }

      const validItems = itemList
        .filter(i => i.bait_id && i.initial_quantity)
        .map(i => ({
          bait_id: parseInt(i.bait_id),
          spec_id: i.spec_id, // can be string or int
          warehouse_id: parseInt(i.warehouse_id),
          initial_quantity: parseInt(i.initial_quantity),
          kg_per_box: parseFloat(i.kg_per_box),
          unit_price_usd: i.unit_price_usd ? parseFloat(i.unit_price_usd) : null,
          unit_price_krw: i.unit_price_krw ? parseInt(i.unit_price_krw) : null,
          warehouse_mgmt_no: i.warehouse_mgmt_no || null
        }))

      const payload = { lot: sanitizedLot, items: validItems }
      
      await axios.post(`${API_BASE}/inbound/integrated`, payload)
      
      alert("입고 데이터가 등록되었습니다.")
      fetchLots()
      fetchAllInventory()
      setShowLotForm(false)
      setNewLot({ id: '', supplier_name: '', exporter_info: '', etd: '', eta: '', inbound_date: '', status: 'Arrived' })
      setItemList([emptyItem()])
    } catch (err) {
      const errorDetail = err.response?.data?.detail
      const errorMessage = typeof errorDetail === 'object' ? JSON.stringify(errorDetail) : errorDetail
      alert("등록 실패: " + (errorMessage || err.message))
    }
  }

  const handleAddInventory = async () => {
    if (!selectedLot) return
    try {
      const payload = {
        lot_id: selectedLot.id,
        bait_id: parseInt(itemForm.bait_id),
        spec_id: itemForm.spec_id,
        warehouse_id: parseInt(itemForm.warehouse_id),
        initial_quantity: parseInt(itemForm.initial_quantity),
        kg_per_box: parseFloat(itemForm.kg_per_box),
        unit_price_usd: itemForm.unit_price_usd ? parseFloat(itemForm.unit_price_usd) : null,
        unit_price_krw: itemForm.unit_price_krw ? parseInt(itemForm.unit_price_krw) : null,
        warehouse_mgmt_no: itemForm.warehouse_mgmt_no || null
      };

      await axios.post(`${API_BASE}/inventory`, payload);
      alert("품목이 추가되었습니다.");
      
      setItemForm({ 
        bait_id: '', 
        spec_id: '', 
        warehouse_id: '', 
        initial_quantity: '', 
        kg_per_box: 10.0, 
        unit_price_usd: '', 
        unit_price_krw: '', 
        warehouse_mgmt_no: '',
        _isManualSpec: false 
      });
      setItemFormSpecs([]);
      fetchLotItems(selectedLot.id);
    } catch (err) {
      alert("품목 추가 실패: " + (err.response?.data?.detail || err.message));
    }
  }

  const handleDeleteLot = async (lotId) => {
    if (!window.confirm(`Lot ${lotId}와 관련된 모든 재고 데이터가 삭제됩니다. 계속하시겠습니까?`)) return
    try {
      await axios.delete(`${API_BASE}/lots/${lotId}`)
      alert("Lot이 삭제되었습니다.")
      fetchLots()
      if (selectedLot?.id === lotId) setSelectedLot(null)
    } catch (err) {
      alert("삭제 실패")
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("이 품목을 삭제하시겠습니까?")) return
    try {
      await axios.delete(`${API_BASE}/inventory/${itemId}`)
      alert("품목이 삭제되었습니다.")
      fetchLotItems(selectedLot.id)
    } catch (err) {
      alert("삭제 실패")
    }
  }

  const openInventoryManager = (lot) => {
    setSelectedLot(lot)
    fetchLotItems(lot.id)
    // Scroll to top so user sees the panel that appears above the list
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="inbound-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>수입(Lot) 및 입고 내역</h2>
        <button className="btn-primary" onClick={() => setShowLotForm(true)}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> 신규 BL(Lot) 등록
        </button>
      </div>

      {showLotForm && (
        <div className="glass-card" style={{ marginBottom: '2rem', border: '1px solid var(--accent-blue)', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ color: 'var(--accent-blue)', margin: 0 }}>신규 입고 데이터 등록 (통합 입력)</h3>
            <X size={24} onClick={() => setShowLotForm(false)} style={{ cursor: 'pointer' }} />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                BL 번호 / 관리번호
                <span 
                  onClick={() => {
                    const now = new Date();
                    const timestamp = now.getFullYear().toString().slice(-2) + 
                                    (now.getMonth()+1).toString().padStart(2,'0') + 
                                    now.getDate().toString().padStart(2,'0') + '-' + 
                                    Math.floor(Math.random()*1000).toString().padStart(3,'0');
                    setNewLot({...newLot, id: 'REF-' + timestamp});
                  }} 
                  style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  번호 자동생성
                </span>
              </label>
              <input type="text" value={newLot.id} onChange={e => setNewLot({...newLot, id: e.target.value})} placeholder="BL 번호 또는 임의의 관리번호" />
            </div>
            <div className="form-group">
              <label>공급업체</label>
              <input type="text" value={newLot.supplier_name} onChange={e => setNewLot({...newLot, supplier_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>수출국 (Origin)</label>
              {!showManualOrigin ? (
                <select 
                  value={newLot.exporter_info} 
                  onChange={e => {
                    if (e.target.value === "manual") {
                      setShowManualOrigin(true)
                      setNewLot({...newLot, exporter_info: ''})
                    } else {
                      setNewLot({...newLot, exporter_info: e.target.value})
                    }
                  }}
                >
                  <option value="">선택하세요</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="manual">+ 직접 입력</option>
                </select>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    value={newLot.exporter_info} 
                    onChange={e => setNewLot({...newLot, exporter_info: e.target.value})} 
                    placeholder="국가명 입력"
                  />
                  <button onClick={() => setShowManualOrigin(false)} style={{ padding: '0 0.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '0.4rem', color: 'white', cursor: 'pointer' }}>취소</button>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>실제 입고일 (과거 데이터 입력 시 필수)</label>
              <input type="date" value={newLot.inbound_date} onChange={e => setNewLot({...newLot, inbound_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>출발일(ETD) - 선택</label>
              <input type="date" value={newLot.etd} onChange={e => setNewLot({...newLot, etd: e.target.value})} />
            </div>
            <div className="form-group">
              <label>도착예정일(ETA) - 선택</label>
              <input type="date" value={newLot.eta} onChange={e => setNewLot({...newLot, eta: e.target.value})} />
            </div>
            <div className="form-group">
              <label>상태</label>
              <select value={newLot.status} onChange={e => setNewLot({...newLot, status: e.target.value})}>
                <option value="Arrived">Arrived (입고완료)</option>
                <option value="In-transit">In-transit (항해중)</option>
                <option value="Cleared">Cleared (통관완료)</option>
              </select>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>품목 목록 (규격별 입력)</h4>
              <button onClick={addItemRow} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(56,189,248,0.15)', border: '1px solid var(--accent-blue)', borderRadius: '0.4rem', color: 'var(--accent-blue)', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <Plus size={16} /> 규격 추가
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>미끼 종류</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', width: '140px' }}>규격</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>냉동창고</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>수량 (C/S)</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>중량 (KG/Case)</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>창고 관리번호</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>단가 (USD $)</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>단가 (KRW ₩)</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {itemList.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.4rem' }}>
                      <select value={item.bait_id} onChange={e => { updateItem(idx, 'bait_id', e.target.value); updateItem(idx, 'spec_id', ''); fetchSpecs(e.target.value, idx); }} style={{ width: '100%' }}>
                        <option value=''>선택</option>
                        {baits.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                        {item._isManualSpec ? (
                          <input 
                            placeholder="규격 입력" 
                            value={item.spec_id} 
                            onChange={e => updateItem(idx, 'spec_id', e.target.value)}
                            style={{ width: '100%', fontSize: '0.85rem' }}
                          />
                        ) : (
                          <select value={item.spec_id} onChange={e => updateItem(idx, 'spec_id', e.target.value)} style={{ width: '100%' }}>
                            <option value=''>선택</option>
                            {(item._specs || []).map(s => <option key={s.id} value={s.id}>{s.size_range}</option>)}
                          </select>
                        )}
                        <button 
                          onClick={() => updateItem(idx, '_isManualSpec', !item._isManualSpec)}
                          style={{ padding: '0.25rem', background: item._isManualSpec ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '0.3rem', cursor: 'pointer', color: 'white' }}
                          title="직접 입력 전환"
                        >
                          <ChevronRight size={14} style={{ transform: item._isManualSpec ? 'rotate(180deg)' : 'none' }} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      <select value={item.warehouse_id} onChange={e => updateItem(idx, 'warehouse_id', e.target.value)} style={{ width: '100%' }}>
                        <option value=''>선택</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      <input type='number' value={item.initial_quantity} onChange={e => updateItem(idx, 'initial_quantity', e.target.value)} style={{ width: '100%' }} />
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      <input type='number' step='0.5' value={item.kg_per_box} onChange={e => updateItem(idx, 'kg_per_box', e.target.value)} style={{ width: '100%' }} />
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      <input type='text' value={item.warehouse_mgmt_no} onChange={e => updateItem(idx, 'warehouse_mgmt_no', e.target.value)} placeholder="번호" style={{ width: '100%' }} />
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      <input type='number' step='0.01' value={item.unit_price_usd} onChange={e => updateItem(idx, 'unit_price_usd', e.target.value)} placeholder='0.00' style={{ width: '100%' }} />
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      <input type='number' value={item.unit_price_krw} onChange={e => updateItem(idx, 'unit_price_krw', e.target.value)} placeholder='0' style={{ width: '100%' }} />
                    </td>
                    <td style={{ padding: '0.4rem', textAlign: 'center' }}>
                      <button onClick={() => removeItemRow(idx)} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ marginTop: '2rem', textAlign: 'right' }}>
            <button className="btn-primary" onClick={handleCreateLotWithItem} style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}>입고 내역 등록하기</button>
          </div>
        </div>
      )}

      <div className="glass-card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '1rem' }}>BL 번호 (Lot)</th>
              <th>공급업체</th>
              <th>입고일 / ETA</th>
              <th>총 수량 / 잔량</th>
              <th>상태</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {lots.map(lot => {
              const items = allInventory.filter(i => i.lot_id === lot.id)
              const totalInitial = items.reduce((sum, i) => sum + i.initial_quantity, 0)
              const totalCurrent = items.reduce((sum, i) => sum + i.current_quantity, 0)
              
              return (
                <tr key={lot.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: selectedLot?.id === lot.id ? 'rgba(56, 189, 248, 0.05)' : 'transparent' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{lot.id}</td>
                  <td>{lot.supplier_name}</td>
                  <td>
                    <div style={{ fontSize: '0.9rem' }}>{lot.inbound_date ? new Date(lot.inbound_date).toLocaleDateString() : '-'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ETA: {lot.eta ? new Date(lot.eta).toLocaleDateString() : '-'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{totalInitial.toLocaleString()} C/S</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue)' }}>잔량: {totalCurrent.toLocaleString()}</div>
                    {/* Product tags */}
                    <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {items.map((i, idx) => {
                        const spec = allSpecs.find(s => s.id === i.spec_id)
                        const bait = spec ? baits.find(b => b.id === spec.bait_id) : null
                        const warehouse = warehouses.find(w => w.id === i.warehouse_id)
                        return (
                          <span key={idx} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', background: 'rgba(56,189,248,0.15)', color: 'var(--accent-blue)' }}>
                            {bait?.name} {spec?.size_range}
                            {warehouse && <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '0.3rem' }}>| {warehouse.name}</span>}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.8rem',
                    backgroundColor: lot.status === 'Arrived' ? 'var(--success)' : 'var(--warning)',
                    color: '#0f172a'
                  }}>
                    {lot.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                      onClick={() => openInventoryManager(lot)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <Package size={18} style={{ marginRight: '0.4rem' }} /> 재고 관리
                    </button>
                    <button 
                      onClick={() => handleDeleteLot(lot.id)}
                      style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>

      {/* Inventory Manager Panel - appears BELOW the lot list */}
      {selectedLot && (
        <div className="glass-card" style={{ marginTop: '2rem', border: '1px solid var(--accent-blue)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>재고 상세 관리: {selectedLot.id}</h3>
            <button onClick={() => setSelectedLot(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
          </div>
          
          <div className="inventory-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 0.6fr 1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
            <div>
              <label>미끼 종류</label>
              <select value={itemForm.bait_id} onChange={e => { 
                const bid = e.target.value;
                const bait = baits.find(b => b.id === parseInt(bid));
                let weight = 10.0;
                if (bait) {
                  if (bait.name.includes('정어리') && bait.origin.includes('멕시코')) weight = 15.0;
                  else if (bait.name.includes('오징어')) weight = 20.0;
                }
                setItemForm({...itemForm, bait_id: bid, spec_id: '', kg_per_box: weight}); 
                fetchItemFormSpecs(bid); 
              }}>
                <option value="">선택</option>
                {baits.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                규격
                <span 
                  onClick={() => setItemForm({...itemForm, _isManualSpec: !itemForm._isManualSpec, spec_id: ''})} 
                  style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {itemForm._isManualSpec ? '목록선택' : '직접입력'}
                </span>
              </label>
              {itemForm._isManualSpec ? (
                <input value={itemForm.spec_id} onChange={e => setItemForm({...itemForm, spec_id: e.target.value})} placeholder="직접 입력" />
              ) : (
                <select value={itemForm.spec_id} onChange={e => setItemForm({...itemForm, spec_id: e.target.value})}>
                  <option value="">선택</option>
                  {itemFormSpecs.map(s => <option key={s.id} value={s.id}>{s.size_range}</option>)}
                </select>
              )}
            </div>
            <div>
              <label>창고</label>
              <select value={itemForm.warehouse_id} onChange={e => setItemForm({...itemForm, warehouse_id: e.target.value})}>
                <option value="">선택</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label>수량 (C/S)</label>
              <input type="number" value={itemForm.initial_quantity} onChange={e => setItemForm({...itemForm, initial_quantity: e.target.value})} />
            </div>
            <div>
              <label>중량(KG/Case)</label>
              <input type="number" step="0.5" value={itemForm.kg_per_box} onChange={e => setItemForm({...itemForm, kg_per_box: e.target.value})} />
            </div>
            <div>
              <label>단가 (USD $)</label>
              <input type="number" step="0.01" value={itemForm.unit_price_usd} onChange={e => setItemForm({...itemForm, unit_price_usd: e.target.value})} placeholder="0.00" />
            </div>
            <div>
              <label>단가 (KRW)</label>
              <input type="number" value={itemForm.unit_price_krw} onChange={e => setItemForm({...itemForm, unit_price_krw: e.target.value})} />
            </div>
            <div>
              <label>창고 관리번호</label>
              <input type="text" value={itemForm.warehouse_mgmt_no} onChange={e => setItemForm({...itemForm, warehouse_mgmt_no: e.target.value})} placeholder="예: 368" />
            </div>
            <button className="btn-primary" onClick={handleAddInventory} style={{ height: '38px' }}><Plus size={18} /></button>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h4>적재 내역</h4>
            {lotItems.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>등록된 품목이 없습니다.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.5rem' }}>품목</th>
                    <th>규격</th>
                    <th>창고</th>
                    <th>수량 (C/S)</th>
                    <th>중량 (KG/Case)</th>
                    <th>관리번호</th>
                    <th>단가 (USD)</th>
                    <th>단가 (KRW)</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lotItems.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '0.5rem' }}>{(() => { const s = allSpecs.find(s => s.id === item.spec_id); return s ? baits.find(b => b.id === s.bait_id)?.name : '-' })()}</td>
                      <td>{allSpecs.find(s => s.id === item.spec_id)?.size_range || item.spec_id}</td>
                      <td>{warehouses.find(w => w.id === item.warehouse_id)?.name}</td>
                      <td style={{ fontWeight: 600 }}>{item.initial_quantity.toLocaleString()}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{item.kg_per_box}kg/Case</td>
                      <td style={{ color: 'var(--accent-blue)', fontSize: '0.85rem' }}>{item.warehouse_mgmt_no || '-'}</td>
                      <td>{item.unit_price_usd ? `$${item.unit_price_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
                      <td>{item.unit_price_krw ? `₩${item.unit_price_krw.toLocaleString('ko-KR')}` : '-'}</td>
                      <td>
                        <button onClick={() => handleDeleteItem(item.id)} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <style>{`
        input, select {
          width: 100%;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 0.4rem;
          color: white;
          margin-top: 0.25rem;
        }
        select option {
          background: var(--bg-dark);
          color: white;
        }
        label {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
      `}</style>
      <style>{`
        .inbound-page {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .glass-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.45);
        }
        .inbound-page select {
          background: #1a2332;
          color: white;
          border: 1px solid rgba(56, 189, 248, 0.2);
          padding: 0.4rem 0.5rem;
          border-radius: 0.4rem;
          width: 100%;
          transition: border-color 0.2s;
        }
        .inbound-page select:focus {
          border-color: var(--accent-blue);
          outline: none;
        }
        .inbound-page input[type='number'],
        .inbound-page input[type='text'],
        .inbound-page input[type='date'] {
          background: #1a2332;
          color: white;
          border: 1px solid rgba(56, 189, 248, 0.2);
          padding: 0.4rem 0.5rem;
          border-radius: 0.4rem;
          width: 100%;
          transition: border-color 0.2s;
        }
        .inbound-page input:focus {
          border-color: var(--accent-blue);
          outline: none;
        }
        .inbound-page label {
          display: block;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.6);
          margin-bottom: 0.3rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}

export default InboundPage
