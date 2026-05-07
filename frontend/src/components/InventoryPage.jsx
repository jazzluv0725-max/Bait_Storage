import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import { Filter, TrendingUp, Info } from 'lucide-react'

const API_BASE = 'http://localhost:8000'

const InventoryPage = () => {
  const [baits, setBaits] = useState([])
  const [selectedBaitId, setSelectedBaitId] = useState('')
  const [inventory, setInventory] = useState([])
  const [lots, setLots] = useState([])
  const [specs, setSpecs] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [baitsRes, invRes, lotsRes, specsRes, warehousesRes] = await Promise.all([
        axios.get(`${API_BASE}/master/baits`),
        axios.get(`${API_BASE}/inventory`),
        axios.get(`${API_BASE}/lots`),
        axios.get(`${API_BASE}/master/bait_specs`),
        axios.get(`${API_BASE}/master/warehouses`)
      ])
      setBaits(baitsRes.data)
      setInventory(invRes.data)
      setLots(lotsRes.data)
      setSpecs(specsRes.data)
      setWarehouses(warehousesRes.data)
      
      if (baitsRes.data.length > 0 && !selectedBaitId) {
        setSelectedBaitId(baitsRes.data[0].id.toString())
      }
    } catch (err) {
      console.error("Data fetch error", err)
    } finally {
      setLoading(false)
    }
  }

  // Pivot Data for Matrix View
  const matrixData = useMemo(() => {
    if (!selectedBaitId || specs.length === 0) return null

    const baitIdNum = parseInt(selectedBaitId)

    // 1. Filter specs for selected bait
    const relevantSpecs = specs.filter(s => s.bait_id === baitIdNum)
    if (relevantSpecs.length === 0) return null

    const relevantSpecIds = new Set(relevantSpecs.map(s => s.id))

    // 2. Filter inventory that belongs to these specs
    const relevantInv = inventory.filter(i => relevantSpecIds.has(i.spec_id))
    
    // 3. Find unique lots present in this bait's inventory
    const lotIds = [...new Set(relevantInv.map(i => i.lot_id))]
    if (lotIds.length === 0) return null

    const relevantLots = lots
      .filter(l => lotIds.includes(l.id))
      .sort((a, b) => new Date(a.inbound_date || 0) - new Date(b.inbound_date || 0))

    // 4. Build matrix
    let totalWeightKg = 0
    const matrix = relevantSpecs.map(spec => {
      const lotValues = {}
      let rowTotal = 0
      
      relevantLots.forEach(lot => {
        const item = relevantInv.find(i => i.spec_id === spec.id && i.lot_id === lot.id)
        const qty = item ? item.current_quantity : 0
        lotValues[lot.id] = {
          qty,
          unit_price_usd: item?.unit_price_usd,
          unit_price_krw: item?.unit_price_krw,
          warehouse_id: item?.warehouse_id,
          kg_per_box: item?.kg_per_box || 10.0
        }
        rowTotal += qty
        totalWeightKg += (qty * (item?.kg_per_box || 10.0))
      })
      
      return { specId: spec.id, sizeRange: spec.size_range, lotValues, rowTotal }
    })

    return { specs: relevantSpecs, lots: relevantLots, matrix, totalWeightKg }
  }, [selectedBaitId, inventory, lots, specs])

  const totalStock = matrixData?.matrix.reduce((sum, row) => sum + row.rowTotal, 0) || 0

  return (
    <div className="inventory-page">
      {/* Header Info */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <TrendingUp size={18} style={{ marginRight: '0.5rem', color: 'var(--accent-blue)' }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>가용 재고 총합 (선택 제품)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{totalStock.toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 400 }}>BOX</span></div>
            <div style={{ fontSize: '1.2rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
              {(matrixData?.totalWeightKg / 1000).toFixed(1)} <span style={{ fontSize: '0.8rem' }}>MT</span>
            </div>
          </div>
        </div>
        
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <Filter size={18} style={{ marginRight: '0.5rem', color: 'var(--warning)' }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>제품 선택</span>
          </div>
          <select 
            value={selectedBaitId} 
            onChange={e => setSelectedBaitId(e.target.value)}
            style={{ 
              width: '100%', padding: '0.6rem 0.75rem',
              background: '#1a2332',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '0.4rem', color: 'white',
              fontSize: '0.95rem', cursor: 'pointer',
              appearance: 'auto'
            }}
          >
            {baits.map(b => <option key={b.id} value={b.id}>{b.name} ({b.origin})</option>)}
          </select>
        </div>
      </div>

      {/* Matrix View */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Sticky Title - fixed on vertical scroll */}
        <div style={{ 
          display: 'flex', alignItems: 'center', padding: '1.25rem 1.5rem',
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(15, 25, 40, 0.97)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <Info size={18} style={{ marginRight: '0.5rem', color: 'var(--accent-blue)' }} />
          <h3 style={{ margin: 0 }}>규격별 / BL(Lot)별 상세 재고 현황</h3>
        </div>

        {/* Horizontally scrollable table area */}
        <div style={{ overflowX: 'auto', padding: '1.5rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>데이터를 불러오는 중입니다...</div>
        ) : !matrixData || matrixData.matrix.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            선택한 제품에 대한 재고 정보가 없습니다. 먼저 입고 관리를 통해 재고를 등록해 주세요.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '1rem', textAlign: 'left', minWidth: '100px', background: '#1a2332', position: 'sticky', left: 0, zIndex: 3, boxShadow: 'none' }}>규격 (Size)</th>
                <th style={{ padding: '1rem', textAlign: 'center', background: '#152a3a', fontWeight: 700, minWidth: '100px', position: 'sticky', left: '100px', zIndex: 3, boxShadow: '3px 0 6px rgba(0,0,0,0.4)' }}>합계 (Total)</th>
                {matrixData.lots.map(lot => (
                  <th key={lot.id} style={{ padding: '1rem', textAlign: 'center', borderLeft: '1px solid var(--border-color)' }}>
                    <div style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{lot.id}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 400 }}>{lot.inbound_date ? new Date(lot.inbound_date).toLocaleDateString() : '미정'}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixData.matrix.map(row => (
                <tr key={row.specId} style={{ borderBottom: '1px solid var(--border-color)', height: '50px' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, background: '#1a2332', position: 'sticky', left: 0, zIndex: 2 }}>{row.sizeRange}</td>
                  <td style={{ textAlign: 'center', background: '#152a3a', fontWeight: 700, color: 'var(--accent-blue)', fontSize: '1.05rem', position: 'sticky', left: '100px', zIndex: 2, boxShadow: '3px 0 6px rgba(0,0,0,0.4)' }}>
                    {row.rowTotal.toLocaleString()}
                  </td>
                  {matrixData.lots.map(lot => {
                    const cell = row.lotValues[lot.id]
                    const qty = cell?.qty || 0
                    const warehouseName = cell?.warehouse_id ? warehouses.find(w => w.id === cell.warehouse_id)?.name : null
                    return (
                      <td key={lot.id} style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)', color: qty > 0 ? 'white' : 'rgba(255,255,255,0.2)', padding: '0.5rem' }}>
                        <div>{qty > 0 ? qty.toLocaleString() : '-'}</div>
                        {warehouseName && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>{warehouseName}</div>}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {/* Unit Price Row */}
              <tr style={{ borderTop: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', background: '#1a2332', position: 'sticky', left: 0, zIndex: 2 }}>단가</td>
                <td style={{ background: '#152a3a', position: 'sticky', left: '100px', zIndex: 2, boxShadow: '3px 0 6px rgba(0,0,0,0.4)' }}></td>
                {matrixData.lots.map(lot => {
                  // Find price from any spec in this lot
                  let usd = null;
                  let krw = null;
                  for (const row of matrixData.matrix) {
                    const cell = row.lotValues[lot.id];
                    if (cell?.unit_price_usd) usd = cell.unit_price_usd;
                    if (cell?.unit_price_krw) krw = cell.unit_price_krw;
                    if (usd || krw) break; // found price
                  }
                  return (
                    <td key={lot.id} style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)', fontSize: '0.8rem', padding: '0.5rem' }}>
                      {usd ? <div style={{ color: '#4ade80' }}>${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div> : null}
                      {krw ? <div style={{ color: 'var(--text-secondary)' }}>₩{krw.toLocaleString('ko-KR')}</div> : null}
                      {!usd && !krw ? <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span> : null}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        )}
        </div> {/* end overflowX scroll container */}
      </div> {/* end glass-card */}

      <style>{`
        .inventory-page {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        th, td {
          white-space: nowrap;
        }
        .inventory-page select option {
          background: #1a2332;
          color: white;
        }
      `}</style>
    </div>
  )
}

export default InventoryPage
