import React, { useState } from 'react'
import { LayoutDashboard, Ship, PackageSearch, ClipboardList, Map as MapIcon, Settings } from 'lucide-react'
import { motion } from 'framer-motion'
import InboundPage from './components/InboundPage'
import InventoryPage from './components/InventoryPage'
import OutboundPage from './components/OutboundPage'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'inbound', label: '입고/수입 관리', icon: PackageSearch },
    { id: 'inventory', label: '재고 현황', icon: ClipboardList },
    { id: 'outbound', label: '출고 관리', icon: Ship },
    { id: 'tracking', label: '컨테이너 추적', icon: MapIcon },
  ]

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo" style={{ marginBottom: '2rem', padding: '0 1rem' }}>
          <h2 style={{ color: 'var(--accent-blue)', margin: 0 }}>BAIT STORAGE</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>연승선 미끼 관리 시스템</p>
        </div>
        
        <nav>
          {menuItems.map((item) => (
            <div 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                margin: '0.25rem 0',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                color: activeTab === item.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                backgroundColor: activeTab === item.id ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              <item.icon size={20} style={{ marginRight: '0.75rem' }} />
              <span style={{ fontWeight: 500 }}>{item.label}</span>
            </div>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0 }}>{menuItems.find(m => m.id === activeTab)?.label}</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              연승선 미끼 수입 및 재고 현황을 실시간으로 관리합니다.
            </p>
          </div>
          <div className="user-profile glass-card" style={{ padding: '0.5rem 1rem' }}>
            <span style={{ fontSize: '0.9rem' }}>관리자님, 환영합니다</span>
          </div>
        </header>

        <section className="content">
          {activeTab === 'dashboard' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="dashboard-grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}
            >
              <div className="glass-card">
                <h3 style={{ marginTop: 0 }}>전체 재고 요약</h3>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-blue)' }}>12,450 C/S</div>
                <p style={{ color: 'var(--text-secondary)' }}>가용 재고: 8,200 C/S</p>
              </div>
              <div className="glass-card">
                <h3 style={{ marginTop: 0 }}>예약/출고 대기</h3>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>4,250 C/S</div>
                <p style={{ color: 'var(--text-secondary)' }}>신영 51호 외 3선박</p>
              </div>
              <div className="glass-card">
                <h3 style={{ marginTop: 0 }}>입항 예정 (Lot)</h3>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>3 BL</div>
                <p style={{ color: 'var(--text-secondary)' }}>무로아지 외 2종</p>
              </div>
            </motion.div>
          )}
          {activeTab === 'inbound' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <InboundPage />
            </motion.div>
          )}
          {activeTab === 'inventory' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <InventoryPage />
            </motion.div>
          )}
          {activeTab === 'outbound' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <OutboundPage />
            </motion.div>
          )}
          {activeTab === 'tracking' && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '5rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>컨테이너 추적 화면 준비 중입니다.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
