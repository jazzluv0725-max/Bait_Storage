import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, CheckCircle, Clock, Truck, Ship, FileText, Search, X, Database } from 'lucide-react'

const API_BASE = 'http://127.0.0.1:8000'

const OutboundPage = () => {
  const [vessels, setVessels] = useState([])
  const [availableInventory, setAvailableInventory] = useState([])
  const [outboundOrders, setOutboundOrders] = useState([])
  
  // Order Form State
  const [orderForm, setOrderForm] = useState({
    vessel_id: '',
    carrier_name: '',
    sub_vessel_id: '',
    delivery_type: 'Direct',
    schedule_date: new Date().toISOString().split('T')[0],
    departure_point: '감천부두',
    arrival_time: '11:00 AM',
    remarks: '상차 시 필히 PALETTE 사용 부탁합니다.',
    status: 'pending'
  })
  
  const [selectedItems, setSelectedItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [baitFilter, setBaitFilter] = useState('')
  const [specFilter, setSpecFilter] = useState('')

  // Requisition Modal State
  const [showReqModal, setShowReqModal] = useState(false)
  const [reqItems, setReqItems] = useState([{ bait_id: '', spec_id: '', requested_qty: 0, _specs: [] }])
  const [allocationData, setAllocationData] = useState(null)
  const [allBaits, setAllBaits] = useState([])
  const [allSpecs, setAllSpecs] = useState([])

  // Dispatch Confirmation Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [dispatchForm, setDispatchForm] = useState({ orderId: null, actual_date: '', departure_point: '' })

  useEffect(() => {
    fetchVessels()
    fetchAvailableInventory()
    fetchOutboundOrders()
    fetchMasterData()
  }, [])

  const fetchMasterData = async () => {
    try {
      const [bRes, sRes] = await Promise.all([
        axios.get(`${API_BASE}/master/baits`),
        axios.get(`${API_BASE}/master/bait_specs`)
      ])
      setAllBaits(bRes.data)
      setAllSpecs(sRes.data)
    } catch (err) { console.error(err) }
  }

  const fetchVessels = async () => {
    try {
      const res = await axios.get(`${API_BASE}/master/vessels`)
      console.log("Vessels fetched:", res.data)
      setVessels(res.data)
    } catch (err) { 
      console.error("Vessel fetch error:", err)
      // alert("선박 목록을 불러오지 못했습니다. 서버 상태를 확인해주세요.")
    }
  }

  const fetchAvailableInventory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/inventory/available`)
      setAvailableInventory(res.data)
    } catch (err) { console.error(err) }
  }

  const fetchOutboundOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE}/outbound`)
      setOutboundOrders(res.data)
    } catch (err) { console.error(err) }
  }

  const handleAddItem = (inv) => {
    if (selectedItems.find(item => item.id === inv.id)) return
    setSelectedItems([...selectedItems, { ...inv, release_quantity: 0 }])
  }

  const handleRemoveItem = (id) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id))
  }

  const updateItemQty = (id, qty) => {
    const inv = availableInventory.find(i => i.id === id)
    const available = inv ? inv.current_quantity - inv.reserved_quantity : 0
    const requested = parseInt(qty) || 0
    
    if (requested > available) {
      alert(`재고가 부족합니다. (현재 가용량: ${available} C/S)`)
      return
    }

    setSelectedItems(selectedItems.map(item => 
      item.id === id ? { ...item, release_quantity: requested } : item
    ))
  }

  const handleSubmitOrder = async (status = 'pending') => {
    if (!orderForm.vessel_id && !orderForm.carrier_name) {
      alert("대상 선박 또는 운반선명을 입력해주세요.")
      return
    }
    if (selectedItems.length === 0) {
      alert("출고할 품목을 선택해주세요.")
      return
    }

    const payload = {
      ...orderForm,
      vessel_id: orderForm.vessel_id ? parseInt(orderForm.vessel_id) : null,
      sub_vessel_id: orderForm.sub_vessel_id ? parseInt(orderForm.sub_vessel_id) : null,
      status: status,
      items: selectedItems.map(item => ({
        inventory_id: item.id,
        release_quantity: item.release_quantity
      }))
    }

    try {
      await axios.post(`${API_BASE}/outbound`, payload)
      alert("출고 주문이 생성되었습니다.")
      setSelectedItems([])
      fetchOutboundOrders()
      fetchAvailableInventory()
    } catch (err) {
      alert("주문 생성 실패: " + err.response?.data?.detail)
    }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    if (newStatus === 'dispatched') {
      const order = outboundOrders.find(o => o.id === orderId)
      setDispatchForm({
        orderId: orderId,
        actual_date: new Date().toISOString().split('T')[0],
        departure_point: order?.departure_point || ''
      })
      setShowDispatchModal(true)
      return
    }

    try {
      await axios.patch(`${API_BASE}/outbound/${orderId}/status`, { status: newStatus })
      fetchOutboundOrders()
      fetchAvailableInventory()
    } catch (err) {
      alert("상태 변경 실패: " + err.response?.data?.detail)
    }
  }

  const confirmDispatch = async () => {
    try {
      await axios.patch(`${API_BASE}/outbound/${dispatchForm.orderId}/status`, {
        status: 'dispatched',
        actual_date: dispatchForm.actual_date,
        departure_point: dispatchForm.departure_point
      })
      setShowDispatchModal(false)
      fetchOutboundOrders()
      fetchAvailableInventory()
    } catch (err) {
      alert("출고 확정 실패: " + err.response?.data?.detail)
    }
  }

  const handleDeleteOrder = async (orderId) => {
    if (!confirm("정말로 이 출고 기록을 삭제하시겠습니까? (삭제된 정보는 복구할 수 없습니다)")) return
    try {
      await axios.delete(`${API_BASE}/outbound/${orderId}`)
      fetchOutboundOrders()
      fetchAvailableInventory()
    } catch (err) {
      alert("삭제 실패: " + err.response?.data?.detail)
    }
  }

  const handleReqItemChange = (index, field, value) => {
    const newItems = [...reqItems]
    newItems[index][field] = value
    
    if (field === 'bait_id') {
      newItems[index].spec_id = ''
      newItems[index]._specs = allSpecs.filter(s => s.bait_id === parseInt(value))
    }
    setReqItems(newItems)
  }

  const addReqRow = () => setReqItems([...reqItems, { bait_id: '', spec_id: '', requested_qty: 0, _specs: [] }])
  const removeReqRow = (index) => setReqItems(reqItems.filter((_, i) => i !== index))

  const handleRunAllocation = async () => {
    const validItems = reqItems.filter(i => i.bait_id && i.spec_id && i.requested_qty > 0)
    if (validItems.length === 0) return alert("신청 내역을 입력해주세요.")

    try {
      const res = await axios.post(`${API_BASE}/outbound/allocate`, {
        vessel_id: orderForm.vessel_id ? parseInt(orderForm.vessel_id) : null,
        items: validItems.map(i => ({
          bait_id: parseInt(i.bait_id),
          spec_id: parseInt(i.spec_id),
          requested_qty: parseInt(i.requested_qty)
        }))
      })
      setAllocationData(res.data)
    } catch (err) {
      alert("배정 실패: " + err.response?.data?.detail)
    }
  }

  const applyAllocation = () => {
    if (!allocationData) return
    
    // Convert allocation results to selectedItems format
    const newSelectedItems = [...selectedItems]
    
    allocationData.allocations.forEach(alloc => {
      const existingIdx = newSelectedItems.findIndex(item => item.id === alloc.inventory_id)
      if (existingIdx >= 0) {
        newSelectedItems[existingIdx].release_quantity += alloc.qty
      } else {
        newSelectedItems.push({
          ...alloc.inventory,
          release_quantity: alloc.qty
        })
      }
    })
    
    setSelectedItems(newSelectedItems)
    setShowReqModal(false)
    setAllocationData(null)
    setReqItems([{ bait_id: '', spec_id: '', requested_qty: 0, _specs: [] }])
    alert("배정된 항목들이 출고 계획에 추가되었습니다. 부족분은 별도로 확인 부탁드립니다.")
  }

  const filteredInventory = availableInventory.filter(inv => {
    const name = inv.spec?.bait?.name || ''
    const mgmt = inv.warehouse_mgmt_no || ''
    const lot = inv.lot_id || ''
    
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mgmt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lot.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBait = baitFilter === '' || inv.spec?.bait?.name === baitFilter
    const matchesSpec = specFilter === '' || inv.spec?.size_range === specFilter
    return matchesSearch && matchesBait && matchesSpec
  })

  // Get unique bait names for filter
  const uniqueBaitNames = [...new Set(availableInventory.map(inv => inv.spec?.bait?.name))].filter(Boolean).sort()
  
  // Get unique spec names based on selected bait
  const uniqueSpecs = baitFilter 
    ? [...new Set(availableInventory.filter(inv => inv.spec?.bait?.name === baitFilter).map(inv => inv.spec?.size_range))].filter(Boolean).sort()
    : [...new Set(availableInventory.map(inv => inv.spec?.size_range))].filter(Boolean).sort()

  // Calculate total quantity for filtered inventory
  const totalFilteredQty = filteredInventory.reduce((sum, inv) => sum + (inv.current_quantity || 0), 0)

  // Group selected items by warehouse for visual display (Delivery Slips style)
  const groupedItems = selectedItems.reduce((acc, item) => {
    const wName = item.warehouse?.name || '기타'
    if (!acc[wName]) acc[wName] = []
    acc[wName].push(item)
    return acc
  }, {})

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1>출고 관리 <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-secondary)' }}>Outbound Management</span></h1>
          <p>선박별 출어 계획 수립 및 창고별 출고 전표 생성</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Left: Order Creation */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <FileText size={20} color="var(--accent-blue)" /> 출고 계획 수립
            </h2>
            <button 
              className="btn-primary" 
              onClick={() => setShowReqModal(true)}
              style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              <Plus size={16} style={{ marginRight: '6px' }} /> 선박 신청서 자동 배정
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="form-group">
              <label><Ship size={14} style={{ marginRight: '4px' }} /> 대상 선박 (본선)</label>
              <select 
                value={orderForm.vessel_id} 
                onChange={e => setOrderForm({...orderForm, vessel_id: e.target.value})}
                style={{ background: '#1a2332', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <option value="">선박 선택</option>
                {vessels.length > 0 ? (
                  vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)
                ) : (
                  <option disabled>등록된 선박이 없습니다</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label><Truck size={14} style={{ marginRight: '4px' }} /> 운반선/차량 정보</label>
              <input type="text" value={orderForm.carrier_name} onChange={e => setOrderForm({...orderForm, carrier_name: e.target.value})} placeholder="예: SEI SHIN편 / 차량번호" />
            </div>
            <div className="form-group">
              <label>출고 방식</label>
              <select 
                value={orderForm.delivery_type} 
                onChange={e => setOrderForm({...orderForm, delivery_type: e.target.value})}
                style={{ background: '#1a2332', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '0.25rem' }}
              >
                <option value="Direct">본선입항 (Direct)</option>
                <option value="Carrier">운반선탁송 (Carrier)</option>
              </select>
            </div>
            <div className="form-group">
              <label>출고 예정일</label>
              <input type="date" value={orderForm.schedule_date} onChange={e => setOrderForm({...orderForm, schedule_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>도착 장소</label>
              <input type="text" value={orderForm.departure_point} onChange={e => setOrderForm({...orderForm, departure_point: e.target.value})} />
            </div>
            {orderForm.delivery_type === 'Carrier' && (
              <div className="form-group animate-fade-in">
                <label><Ship size={14} style={{ marginRight: '4px', color: 'var(--warning)' }} /> 수령 선박 (최종 목적지)</label>
                <select 
                  value={orderForm.sub_vessel_id} 
                  onChange={e => setOrderForm({...orderForm, sub_vessel_id: e.target.value})}
                  style={{ background: '#1a2332', color: 'white', border: '1px solid var(--warning)', padding: '0.5rem', borderRadius: '0.25rem' }}
                >
                  <option value="">선박 선택</option>
                  {vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <p style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: '4px' }}>* 운반선을 통해 물건을 전달받을 본선</p>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label>특이사항 (출고 전표 기재)</label>
            <textarea 
              value={orderForm.remarks} 
              onChange={e => setOrderForm({...orderForm, remarks: e.target.value})}
              style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '0.5rem', minHeight: '80px' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>출고 품목 (창고별 그룹화)</h3>
            {Object.keys(groupedItems).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '1rem', color: 'var(--text-secondary)' }}>
                우측 리스트에서 출고할 재고를 선택해주세요.
              </div>
            ) : (
              Object.entries(groupedItems).map(([warehouse, items]) => (
                <div key={warehouse} style={{ marginBottom: '1.5rem', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--accent-blue)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>창고: {warehouse}</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>전표 분리 발행 대상</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>품목/규격</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>BL 번호</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>관리번호</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', width: '120px' }}>출고수량(C/S)</th>
                        <th style={{ padding: '0.75rem', width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontWeight: 500 }}>{item.spec?.bait?.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.spec?.size_range} ({item.kg_per_box}kg)</div>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {item.lot_id}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--accent-blue)', fontWeight: 600 }}>
                            {item.warehouse_mgmt_no || '-'}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <input 
                              type="number" 
                              value={item.release_quantity} 
                              onChange={e => updateItemQty(item.id, e.target.value)}
                              style={{ width: '80px', textAlign: 'center', padding: '0.4rem' }}
                            />
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <button onClick={() => handleRemoveItem(item.id)} className="btn-icon" style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button className="btn-primary" onClick={() => handleSubmitOrder('reserved')} style={{ flex: 1, height: '45px' }}>
              <Clock size={18} style={{ marginRight: '8px' }} /> 예약 확정
            </button>
            <button className="btn-primary" onClick={() => handleSubmitOrder('pending')} style={{ flex: 1, height: '45px', background: 'rgba(255,255,255,0.1)' }}>
               계획 저장
            </button>
          </div>
        </div>

        {/* Inventory Selector (Full Width) */}
        <div className="glass-card" style={{ padding: '2rem', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={20} color="var(--accent-blue)" /> 가용 재고 선택 
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 400 }}>(BL 번호별 그룹화)</span>
              { (baitFilter || specFilter || searchTerm) && (
                <div style={{ marginLeft: '1rem', padding: '4px 12px', background: 'var(--accent-blue)', color: 'white', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700 }}>
                  선택 규격 총 합계: {totalFilteredQty.toLocaleString()} C/S
                </div>
              )}
            </h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <select 
                value={baitFilter} 
                onChange={e => setBaitFilter(e.target.value)}
                style={{ 
                  padding: '0.6rem 1rem', 
                  borderRadius: '2rem', 
                  background: 'rgba(56, 189, 248, 0.1)', 
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  color: 'var(--accent-blue)',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <option value="">전체 품명</option>
                {uniqueBaitNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              <select 
                value={specFilter} 
                onChange={e => setSpecFilter(e.target.value)}
                style={{ 
                  padding: '0.6rem 1rem', 
                  borderRadius: '2rem', 
                  background: 'rgba(56, 189, 248, 0.1)', 
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  color: 'var(--accent-blue)',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <option value="">전체 규격</option>
                {uniqueSpecs.map(spec => <option key={spec} value={spec}>{spec}</option>)}
              </select>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="관리번호, BL 번호 검색..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ padding: '0.75rem 1.25rem 0.75rem 2.75rem', borderRadius: '2rem', width: '300px', fontSize: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', overflowY: 'auto' }}>
            {Object.entries(
              filteredInventory.reduce((acc, inv) => {
                const lotId = inv.lot_id || '기타'
                if (!acc[lotId]) acc[lotId] = []
                acc[lotId].push(inv)
                return acc
              }, {})
            ).sort((a, b) => {
              const dateA = new Date(a[1][0]?.lot?.inbound_date || 0)
              const dateB = new Date(b[1][0]?.lot?.inbound_date || 0)
              return dateA - dateB // 입고일 순 (오래된 순)
            }).map(([lotId, items]) => (
              <div key={lotId} style={{ 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: '1rem', 
                border: '1px solid rgba(255,255,255,0.05)',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  background: 'rgba(56, 189, 248, 0.1)', 
                  padding: '1rem', 
                  borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 800, color: 'var(--accent-blue)', fontSize: '1.1rem' }}>
                    BL: {lotId}
                    <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '8px' }}>
                      ({items[0]?.lot?.inbound_date ? new Date(items[0].lot.inbound_date).toLocaleDateString() : '입고일 미정'})
                    </span>
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>잔고 {items.length}개 품목</span>
                </div>
                <div style={{ padding: '1rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>창고/관리번호</th>
                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>품목(규격)</th>
                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>가용량</th>
                        <th style={{ padding: '0.75rem 0.5rem', width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(inv => (
                        <tr key={inv.id} className="hover-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <div style={{ fontWeight: 600 }}>{inv.warehouse?.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue)' }}>{inv.warehouse_mgmt_no || '-'}</div>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <div>{inv.spec?.bait?.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{inv.spec?.size_range}</div>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, color: (inv.current_quantity - inv.reserved_quantity) <= 0 ? 'var(--danger)' : 'white' }}>
                              {(inv.current_quantity - inv.reserved_quantity).toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>C/S</span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              (총 {inv.current_quantity} - 예약 {inv.reserved_quantity})
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <button 
                              onClick={() => {
                                const available = inv.current_quantity - inv.reserved_quantity
                                if (available <= 0) {
                                  alert("가용 재고가 없습니다.")
                                  return
                                }
                                handleAddItem(inv)
                              }} 
                              className="btn-icon" 
                              style={{ 
                                color: 'var(--accent-blue)', 
                                background: 'rgba(56, 189, 248, 0.1)',
                                padding: '6px',
                                borderRadius: '6px',
                                opacity: selectedItems.find(i => i.id === inv.id) ? 0.2 : 1 
                              }}
                              disabled={selectedItems.find(i => i.id === inv.id)}
                            >
                              <Plus size={20} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outbound History (Full Width) */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} color="var(--warning)" /> 최근 출고 현황
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {outboundOrders.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', gridColumn: '1 / -1', padding: '2rem' }}>출고 내역이 없습니다.</p>
            ) : (
              outboundOrders.sort((a,b) => b.id - a.id).slice(0, 8).map(order => (
                <div key={order.id} style={{ 
                  padding: '1.25rem', 
                  background: 'rgba(255,255,255,0.03)', 
                  borderRadius: '1rem', 
                  borderLeft: `5px solid ${order.status === 'dispatched' ? 'var(--success)' : order.status === 'reserved' ? 'var(--warning)' : 'var(--text-secondary)'}`,
                  transition: 'transform 0.2s'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'white' }}>{order.vessel?.name || order.carrier_name}</span>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontWeight: 600,
                      background: order.status === 'dispatched' ? 'rgba(34, 197, 94, 0.1)' : order.status === 'reserved' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255,255,255,0.05)',
                      color: order.status === 'dispatched' ? 'var(--success)' : order.status === 'reserved' ? 'var(--warning)' : 'white',
                      border: `1px solid ${order.status === 'dispatched' ? 'rgba(34, 197, 94, 0.2)' : order.status === 'reserved' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.1)'}`
                    }}>
                      {order.status === 'dispatched' ? '출고완료' : order.status === 'reserved' ? '예약확정' : '계획중'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div><span style={{ opacity: 0.6 }}>예정일:</span> {new Date(order.schedule_date).toLocaleDateString()}</div>
                    {order.actual_date ? (
                      <div style={{ color: 'var(--success)' }}><span style={{ opacity: 0.6 }}>출고일:</span> {new Date(order.actual_date).toLocaleDateString()}</div>
                    ) : (
                      <div><span style={{ opacity: 0.6 }}>품목수:</span> {order.items?.length}건</div>
                    )}
                    <div style={{ gridColumn: '1 / -1' }}><span style={{ opacity: 0.6 }}>목적지:</span> {order.departure_point || '-'}</div>
                  </div>

                  {/* Items Summary in History Card */}
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', fontSize: '0.8rem' }}>
                    {order.items?.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8, marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '2px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{item.inventory?.spec?.bait?.name} ({item.inventory?.spec?.size_range})</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)' }}>
                             Mgmt: {item.inventory?.warehouse_mgmt_no || '-'} / BL: {item.inventory?.lot_id}
                          </span>
                        </div>
                        <span style={{ fontWeight: 600 }}>{item.release_quantity} C/S</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                    {order.status !== 'dispatched' ? (
                      <button className="btn-primary" onClick={() => handleStatusChange(order.id, 'dispatched')} style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}>
                        <CheckCircle size={16} style={{ marginRight: '6px' }} /> 출고확정
                      </button>
                    ) : (
                      <button 
                        className="btn-primary" 
                        onClick={() => {
                          if(confirm("출고를 취소하고 재고를 복구하시겠습니까?")) {
                            handleStatusChange(order.id, 'reserved')
                          }
                        }} 
                        style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem', background: 'var(--danger)', border: 'none' }}
                      >
                        <X size={16} style={{ marginRight: '6px' }} /> 출고 복구
                      </button>
                    )}
                    <button className="btn-icon" onClick={() => handleDeleteOrder(order.id)} style={{ background: 'rgba(255, 68, 68, 0.1)', color: 'var(--danger)', width: '40px', height: '40px' }} title="기록 삭제"><Trash2 size={20} /></button>
                    <button className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', width: '40px', height: '40px' }} title="전표 출력"><FileText size={20} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Requisition Modal */}
      {showReqModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem'
        }}>
          <div className="glass-card animate-scale-in" style={{
            width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', border: '1px solid var(--accent-blue)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>선박 미끼 신청서 입력 <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-secondary)' }}>(FIFO 자동 할당)</span></h2>
              <X size={24} onClick={() => { setShowReqModal(false); setAllocationData(null); }} style={{ cursor: 'pointer' }} />
            </div>

            <div className="form-group" style={{ marginBottom: '2rem', maxWidth: '300px' }}>
              <label><Ship size={14} style={{ marginRight: '4px' }} /> 대상 선박 (본선 선택)</label>
              <select 
                value={orderForm.vessel_id} 
                onChange={e => setOrderForm({...orderForm, vessel_id: e.target.value})}
                style={{ background: '#1a2332', color: 'white', border: '1px solid var(--accent-blue)', padding: '0.6rem' }}
              >
                <option value="">선박 선택</option>
                {vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.5rem' }}>품목</th>
                    <th style={{ padding: '0.5rem' }}>규격</th>
                    <th style={{ padding: '0.5rem' }}>신청 수량(C/S)</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {reqItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <select 
                          value={item.bait_id} 
                          onChange={e => handleReqItemChange(idx, 'bait_id', e.target.value)}
                          style={{ width: '100%', background: '#1a2332', color: 'white', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          <option value="">품목 선택</option>
                          {allBaits.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <select 
                          value={item.spec_id} 
                          onChange={e => handleReqItemChange(idx, 'spec_id', e.target.value)}
                          style={{ width: '100%', background: '#1a2332', color: 'white', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          <option value="">규격 선택</option>
                          {item._specs.map(s => <option key={s.id} value={s.id}>{s.size_range}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="number" 
                          value={item.requested_qty} 
                          onChange={e => handleReqItemChange(idx, 'requested_qty', e.target.value)}
                          style={{ width: '100%', background: '#1a2332', color: 'white', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <button onClick={() => removeReqRow(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button 
                onClick={addReqRow} 
                style={{ marginTop: '1rem', background: 'none', border: '1px dashed rgba(255,255,255,0.2)', color: 'var(--text-secondary)', padding: '0.5rem', width: '100%', borderRadius: '4px', cursor: 'pointer' }}
              >
                + 항목 추가
              </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <button 
                className="btn-primary" 
                onClick={handleRunAllocation}
                style={{ padding: '0.8rem 3rem', fontSize: '1rem' }}
              >
                재고 자동 배정 시뮬레이션
              </button>
            </div>

            {allocationData && (
              <div className="animate-fade-in" style={{ borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
                {allocationData.shortages.length > 0 && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '2rem' }}>
                    <h3 style={{ color: 'var(--danger)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Database size={18} /> 재고 부족 알림
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--danger)', fontSize: '0.95rem' }}>
                      {allocationData.shortages.map((s, i) => (
                        <li key={i}>
                          <strong>{s.bait_name} ({s.size_range})</strong>: {s.short_qty.toLocaleString()} C/S 부족 
                          <span style={{ fontSize: '0.8rem', marginLeft: '10px', opacity: 0.8 }}>(수입/매입 계획 필요)</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <h3 style={{ marginBottom: '1rem' }}>배정 결과 <span style={{ fontSize: '0.9rem', color: 'var(--success)' }}>(가용 재고 선입선출 매칭)</span></h3>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '0.75rem' }}>품목(규격)</th>
                        <th style={{ padding: '0.75rem' }}>창고</th>
                        <th style={{ padding: '0.75rem' }}>BL 번호</th>
                        <th style={{ padding: '0.75rem' }}>입고일</th>
                        <th style={{ padding: '0.75rem' }}>배정수량</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocationData.allocations.map((alloc, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '0.75rem' }}>{alloc.inventory?.spec?.bait?.name} ({alloc.inventory?.spec?.size_range})</td>
                          <td style={{ padding: '0.75rem' }}>{alloc.inventory?.warehouse?.name}</td>
                          <td style={{ padding: '0.75rem' }}>{alloc.inventory?.lot_id}</td>
                          <td style={{ padding: '0.75rem' }}>{new Date(alloc.inventory?.lot?.inbound_date).toLocaleDateString()}</td>
                          <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{alloc.qty.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                  <button className="btn-primary" onClick={applyAllocation} style={{ flex: 1 }}>배정 내역 확정 및 목록 추가</button>
                  <button 
                    onClick={() => setAllocationData(null)} 
                    style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '0.5rem', color: 'white', cursor: 'pointer' }}
                  >
                    재입력
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dispatch Confirmation Modal */}
      {showDispatchModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem'
        }}>
          <div className="glass-card animate-scale-in" style={{
            width: '100%', maxWidth: '450px', padding: '2rem', border: '1px solid var(--success)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={24} color="var(--success)" /> 출고 최종 확정
              </h2>
              <X size={24} onClick={() => setShowDispatchModal(false)} style={{ cursor: 'pointer' }} />
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              실제 출고된 날짜와 도착 장소를 확인해 주세요. <br/>
              확정 시 재고가 즉시 차감됩니다.
            </p>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>실제 출고일</label>
              <input 
                type="date" 
                value={dispatchForm.actual_date} 
                onChange={e => setDispatchForm({...dispatchForm, actual_date: e.target.value})}
                style={{ border: '1px solid var(--success)' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label>도착 장소 (수정 가능)</label>
              <input 
                type="text" 
                value={dispatchForm.departure_point} 
                onChange={e => setDispatchForm({...dispatchForm, departure_point: e.target.value})}
                placeholder="예: 감천부두 5번 선석"
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-primary" onClick={confirmDispatch} style={{ flex: 1, height: '45px', background: 'var(--success)', border: 'none' }}>
                최종 출고 확정
              </button>
              <button 
                onClick={() => setShowDispatchModal(false)} 
                style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '0.5rem', color: 'white', cursor: 'pointer' }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OutboundPage
