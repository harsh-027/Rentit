'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  ArrowDown,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  DoorOpen,
  Download,
  Edit3,
  Filter,
  Home,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Receipt,
  Search,
  Settings,
  SlidersHorizontal,
  Users,
  Wallet,
  X,
} from 'lucide-react'

type Status = 'Paid' | 'Partial' | 'Pending'
type View = 'Dashboard' | 'Rent' | 'Tenants' | 'Rooms' | 'Payments' | 'Pending' | 'Reports' | 'Setup'
type SetupStep = 'profile' | 'rooms' | 'tenants' | 'complete'

type Property = {
  name: string
  ownerName: string
  phone: string
  currency: string
  rentDueDay: number
}

type Room = {
  id: number
  number: string
  floor?: string
  rent: number
  occupied: boolean
  notes?: string
}

type RentHistory = {
  fromMonth: string
  rent: number
  reason?: string
}

type Tenant = {
  id: number
  name: string
  initials: string
  roomId: number
  monthlyRent: number
  securityDeposit: number
  moveInDate: string
  phone: string
  email?: string
  notes?: string
  status: Status
  paid: number
  rentHistory: RentHistory[]
}

type AppState = {
  property: Property | null
  rooms: Room[]
  tenants: Tenant[]
  setupStep: SetupStep
}

const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`

function StatusBadge({ status }: { status: Status }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}><span className="status-dot" />{status}</span>
}

function Avatar({ initials, large = false }: { initials: string; large?: boolean }) {
  return <span className={`avatar ${large ? 'avatar-large' : ''}`}>{initials}</span>
}

export default function Page() {
  const [appState, setAppState] = useState<AppState>({
    property: null,
    rooms: [],
    tenants: [],
    setupStep: 'profile',
  })

  const [view, setView] = useState<View>('Setup')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [editRentOpen, setEditRentOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [paymentMode, setPaymentMode] = useState<'global' | 'tenant'>('global')
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const [currentMonth, setCurrentMonth] = useState('September 2026')

  const isSetupComplete = appState.property !== null && appState.rooms.length > 0 && appState.tenants.length > 0

  useEffect(() => {
    if (isSetupComplete && view === 'Setup') {
      setView('Dashboard')
    }
  }, [isSetupComplete, view])

  const visibleTenants = useMemo(
    () => appState.tenants.filter((tenant) => tenant.name.toLowerCase().includes(query.toLowerCase()) || appState.rooms.find(r => r.id === tenant.roomId)?.number.includes(query)),
    [query, appState.tenants, appState.rooms]
  )

  const activeTenants = appState.tenants.filter((tenant) => {
    const room = appState.rooms.find(r => r.id === tenant.roomId)
    return room?.occupied
  })

  const pendingTenants = activeTenants.filter((tenant) => tenant.paid < tenant.monthlyRent)
  const collected = activeTenants.reduce((sum, tenant) => sum + tenant.paid, 0)
  const expected = activeTenants.reduce((sum, tenant) => sum + tenant.monthlyRent, 0)
  const pending = expected - collected

  const navItems: { label: Exclude<View, 'Setup'>; icon: typeof Home }[] = [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Rent', icon: Wallet },
    { label: 'Tenants', icon: Users },
    { label: 'Rooms', icon: DoorOpen },
    { label: 'Payments', icon: Receipt },
    { label: 'Pending', icon: CircleDollarSign },
    { label: 'Reports', icon: ClipboardList },
  ]

  function recordPayment() {
    setPaymentOpen(false)
    setToast('Payment recorded successfully')
    window.setTimeout(() => setToast(''), 3000)
  }

  function saveRentChange() {
    setEditRentOpen(false)
    setToast('Rent updated successfully')
    window.setTimeout(() => setToast(''), 3000)
  }

  if (!isSetupComplete) {
    return <SetupFlow appState={appState} setAppState={setAppState} />
  }

  const ownerInitials = appState.property?.ownerName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'VD'

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark"><Building2 size={18} /></span><span>Rentit</span></div>
        <div className="property-switcher"><span className="property-icon"><Home size={16} /></span><span><small>PROPERTY</small><strong>{appState.property?.name}</strong></span><ChevronDown size={15} /></div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <span className="nav-label">Overview</span>
          {navItems.slice(0, 1).map(({ label, icon: Icon }) => <NavItem key={label} label={label} icon={Icon} active={view === label} onClick={() => { setView(label); setMobileOpen(false) }} />)}
          <span className="nav-label nav-label-spaced">Manage</span>
          {navItems.slice(1, 5).map(({ label, icon: Icon }) => <NavItem key={label} label={label} icon={Icon} active={view === label} onClick={() => { setView(label); setMobileOpen(false) }} />)}
          <span className="nav-label nav-label-spaced">Insights</span>
          {navItems.slice(5).map(({ label, icon: Icon }) => <NavItem key={label} label={label} icon={Icon} active={view === label} onClick={() => { setView(label); setMobileOpen(false) }} />)}
        </nav>
        <div className="sidebar-bottom"><NavItem label="Settings" icon={Settings} active={false} onClick={() => setToast('Settings coming soon')} /><button className="profile-row" aria-label="Account menu"><Avatar initials={ownerInitials} /><span><strong>{appState.property?.ownerName}</strong><small>Owner account</small></span><MoreHorizontal size={16} /></button></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open navigation"><Menu size={21} /></button><div className="mobile-brand"><span className="brand-mark"><Building2 size={16} /></span>Rentit</div><div className="topbar-actions"><button className="icon-button" aria-label="Notifications"><Bell size={19} /><span className="notification-dot" /></button><div className="top-avatar"><Avatar initials={ownerInitials} /></div></div></header>
        <div className="content-wrap">
          {view === 'Dashboard' && <Dashboard appState={appState} expected={expected} collected={collected} pending={pending} pendingTenants={pendingTenants} setView={setView} onPayment={(tenant) => { setSelectedTenant(tenant); setPaymentMode('tenant'); setPaymentOpen(true) }} onRecordPayment={() => { setSelectedTenant(null); setPaymentMode('global'); setPaymentOpen(true) }} />}
          {view === 'Rent' && <RentPage appState={appState} tenants={visibleTenants} query={query} setQuery={setQuery} onPayment={(tenant) => { setSelectedTenant(tenant); setPaymentMode('tenant'); setPaymentOpen(true) }} onEditRent={(tenant) => { setSelectedTenant(tenant); setEditRentOpen(true) }} />}
          {view === 'Tenants' && <TenantsPage appState={appState} tenants={visibleTenants} query={query} setQuery={setQuery} onPayment={(tenant) => { setSelectedTenant(tenant); setPaymentMode('tenant'); setPaymentOpen(true) }} onEditRent={(tenant) => { setSelectedTenant(tenant); setEditRentOpen(true) }} />}
          {view === 'Rooms' && <RoomsPage appState={appState} />}
          {view === 'Payments' && <PaymentsPage />}
          {view === 'Pending' && <PendingPage pendingTenants={pendingTenants} total={pending} onPayment={(tenant) => { setSelectedTenant(tenant); setPaymentMode('tenant'); setPaymentOpen(true) }} />}
          {view === 'Reports' && <ReportsPage expected={expected} collected={collected} pending={pending} />}
        </div>
      </main>

      {paymentOpen && <PaymentModal mode={paymentMode} appState={appState} selectedTenant={selectedTenant} activeTenants={activeTenants} currentMonth={currentMonth} onClose={() => setPaymentOpen(false)} onSave={recordPayment} />}
      {editRentOpen && selectedTenant && <EditRentModal tenant={selectedTenant} appState={appState} onClose={() => { setEditRentOpen(false); setSelectedTenant(null) }} onSave={saveRentChange} />}
      {toast && <div className="toast"><span className="toast-check"><Check size={14} /></span>{toast}</div>}
    </div>
  )
}

function SetupFlow({ appState, setAppState }: { appState: AppState; setAppState: (state: AppState) => void }) {
  const [formData, setFormData] = useState({
    propertyName: '',
    ownerName: '',
    phone: '',
    currency: '₹',
    rentDueDay: 1,
    roomNumber: '',
    roomFloor: '',
    roomRent: '',
    tenantName: '',
    tenantPhone: '',
    tenantEmail: '',
    tenantRoom: '',
    tenantRent: '',
    securityDeposit: '',
    moveInDate: '',
  })

  const handlePropertySubmit = () => {
    if (formData.propertyName && formData.ownerName && formData.phone) {
      setAppState({
        ...appState,
        property: {
          name: formData.propertyName,
          ownerName: formData.ownerName,
          phone: formData.phone,
          currency: formData.currency,
          rentDueDay: parseInt(formData.rentDueDay.toString()),
        },
        setupStep: 'rooms',
      })
    }
  }

  const handleAddRoom = () => {
    if (formData.roomNumber && formData.roomRent) {
      setAppState({
        ...appState,
        rooms: [...appState.rooms, {
          id: appState.rooms.length + 1,
          number: formData.roomNumber,
          floor: formData.roomFloor,
          rent: parseInt(formData.roomRent),
          occupied: false,
          notes: '',
        }],
      })
      setFormData({ ...formData, roomNumber: '', roomFloor: '', roomRent: '' })
    }
  }

  const handleAddTenant = () => {
    if (formData.tenantName && formData.tenantPhone && formData.tenantRoom && formData.tenantRent) {
      const initials = formData.tenantName.split(' ').map(n => n[0]).join('').toUpperCase()
      const roomId = parseInt(formData.tenantRoom)
      setAppState({
        ...appState,
        tenants: [...appState.tenants, {
          id: appState.tenants.length + 1,
          name: formData.tenantName,
          initials,
          roomId,
          monthlyRent: parseInt(formData.tenantRent),
          securityDeposit: parseInt(formData.securityDeposit) || 0,
          moveInDate: formData.moveInDate,
          phone: formData.tenantPhone,
          email: formData.tenantEmail,
          notes: '',
          status: 'Pending',
          paid: 0,
          rentHistory: [{ fromMonth: 'September 2026', rent: parseInt(formData.tenantRent) }],
        }],
        rooms: appState.rooms.map(r => r.id === roomId ? { ...r, occupied: true } : r),
      })
      setFormData({ ...formData, tenantName: '', tenantPhone: '', tenantEmail: '', tenantRoom: '', tenantRent: '', securityDeposit: '', moveInDate: '' })
    }
  }

  const handleComplete = () => {
    setAppState({ ...appState, setupStep: 'complete' })
  }

  if (appState.setupStep === 'profile') {
    return (
      <div className="setup-container">
        <div className="setup-card">
          <h1>Welcome to Rentit</h1>
          <p>Set up your property profile</p>
          <div className="setup-form">
            <div className="form-group">
              <label>Property Name</label>
              <input value={formData.propertyName} onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })} placeholder="e.g. Greenview Apartments" />
            </div>
            <div className="form-group">
              <label>Owner Name</label>
              <input value={formData.ownerName} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} placeholder="Your name" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 98765 43210" />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}>
                <option value="₹">₹ Indian Rupee</option>
                <option value="$">$ US Dollar</option>
                <option value="€">€ Euro</option>
              </select>
            </div>
            <div className="form-group">
              <label>Default Rent Due Day</label>
              <input type="number" min="1" max="31" value={formData.rentDueDay} onChange={(e) => setFormData({ ...formData, rentDueDay: parseInt(e.target.value) })} />
            </div>
            <button className="button button-primary" onClick={handlePropertySubmit}>Continue</button>
          </div>
        </div>
      </div>
    )
  }

  if (appState.setupStep === 'rooms') {
    return (
      <div className="setup-container">
        <div className="setup-card">
          <h1>Add Rooms</h1>
          <p>Add your rental rooms manually</p>
          <div className="setup-form">
            <div className="form-row">
              <div className="form-group">
                <label>Room Number</label>
                <input value={formData.roomNumber} onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })} placeholder="101" />
              </div>
              <div className="form-group">
                <label>Floor (optional)</label>
                <input value={formData.roomFloor} onChange={(e) => setFormData({ ...formData, roomFloor: e.target.value })} placeholder="1" />
              </div>
            </div>
            <div className="form-group">
              <label>Monthly Rent</label>
              <input type="number" value={formData.roomRent} onChange={(e) => setFormData({ ...formData, roomRent: e.target.value })} placeholder="7000" />
            </div>
            <button className="button button-secondary" onClick={handleAddRoom}>+ Add Room</button>
            {appState.rooms.length > 0 && (
              <div className="rooms-list">
                {appState.rooms.map((room) => (
                  <div key={room.id} className="room-item">
                    <span>Room {room.number}{room.floor ? ` • Floor ${room.floor}` : ''}</span>
                    <span>{formatCurrency(room.rent)}/month</span>
                  </div>
                ))}
              </div>
            )}
            <button className="button button-primary" onClick={() => setAppState({ ...appState, setupStep: 'tenants' })} disabled={appState.rooms.length === 0}>Continue</button>
          </div>
        </div>
      </div>
    )
  }

  if (appState.setupStep === 'tenants') {
    return (
      <div className="setup-container">
        <div className="setup-card">
          <h1>Add Tenants</h1>
          <p>Add your tenants manually</p>
          <div className="setup-form">
            <div className="form-group">
              <label>Tenant Name</label>
              <input value={formData.tenantName} onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })} placeholder="Rahul Sharma" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input value={formData.tenantPhone} onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })} placeholder="+91 98765 43210" />
            </div>
            <div className="form-group">
              <label>Email (optional)</label>
              <input type="email" value={formData.tenantEmail} onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })} placeholder="tenant@example.com" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Room</label>
                <select value={formData.tenantRoom} onChange={(e) => setFormData({ ...formData, tenantRoom: e.target.value })}>
                  <option value="">Select room</option>
                  {appState.rooms.filter(r => !r.occupied).map((room) => (
                    <option key={room.id} value={room.id}>Room {room.number}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Monthly Rent</label>
                <input type="number" value={formData.tenantRent} onChange={(e) => setFormData({ ...formData, tenantRent: e.target.value })} placeholder="7000" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Security Deposit</label>
                <input type="number" value={formData.securityDeposit} onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })} placeholder="14000" />
              </div>
              <div className="form-group">
                <label>Move-in Date</label>
                <input type="date" value={formData.moveInDate} onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })} />
              </div>
            </div>
            <button className="button button-secondary" onClick={handleAddTenant} disabled={!formData.tenantName || !formData.tenantPhone || !formData.tenantRoom || !formData.tenantRent}>+ Add Tenant</button>
            {appState.tenants.length > 0 && (
              <div className="tenants-list">
                {appState.tenants.map((tenant) => (
                  <div key={tenant.id} className="tenant-item">
                    <span><strong>{tenant.name}</strong></span>
                    <span>Room {appState.rooms.find(r => r.id === tenant.roomId)?.number} • {formatCurrency(tenant.monthlyRent)}/month</span>
                  </div>
                ))}
              </div>
            )}
            <button className="button button-primary" onClick={handleComplete} disabled={appState.tenants.length === 0}>Complete Setup</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

function NavItem({ label, icon: Icon, active, onClick }: { label: string; icon: typeof Home; active: boolean; onClick: () => void }) {
  return <button className={`nav-item ${active ? 'nav-active' : ''}`} onClick={onClick}><Icon size={18} /><span>{label}</span></button>
}

function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>
}

function Dashboard({ appState, expected, collected, pending, pendingTenants, setView, onPayment, onRecordPayment }: { appState: AppState; expected: number; collected: number; pending: number; pendingTenants: Tenant[]; setView: (view: View) => void; onPayment: (tenant: Tenant) => void; onRecordPayment: () => void }) {
  const activeTenantCount = appState.tenants.filter(t => appState.rooms.find(r => r.id === t.roomId)?.occupied).length
  const totalRooms = appState.rooms.length

  return <>
    <PageHeader title="Dashboard" subtitle="Tuesday, 22 September 2026" />
    <div className="quick-actions">
      <button className="quick-action"><Plus size={16} /> Add Tenant</button>
      <button className="quick-action"><Plus size={16} /> Add Room</button>
      <button className="quick-action"><CircleDollarSign size={16} /> Record Payment</button>
    </div>
    <div className="month-bar"><div className="month-title"><CalendarDays size={17} /><strong>September 2026</strong></div><button className="select-button">This month <ChevronDown size={15} /></button></div>
    <section className="summary-grid" aria-label="September rent summary"><SummaryCard label="Expected" amount={expected} icon={ArrowUpRight} tone="neutral" note={`From ${activeTenantCount} occupied rooms`} /><SummaryCard label="Collected" amount={collected} icon={Check} tone="green" note={expected > 0 ? `${Math.round((collected / expected) * 100)}% of expected rent` : 'No rent expected'} /><SummaryCard label="Pending" amount={pending} icon={ArrowDown} tone="orange" note={`${pendingTenants.length} tenants need attention`} action={() => setView('Pending')} /><SummaryCard label="Occupancy" amount={activeTenantCount} icon={Building2} tone="blue" note={`of ${totalRooms} total rooms`} suffix={` / ${totalRooms}`} /> </section>
    <div className="dashboard-grid">
      <section className="panel rent-panel">
        <div className="panel-header"><div><h2>Rent status</h2><p>Track this month&apos;s collections</p></div><button className="text-button" onClick={() => setView('Rent')}>View all <ArrowUpRight size={15} /></button></div>
        {appState.tenants.length === 0 ? (
          <div className="empty-state"><p>No tenants added yet.</p><button className="button button-secondary"><Plus size={15} /> Add Tenant</button></div>
        ) : (
          <RentTable appState={appState} tenants={appState.tenants.slice(0, 5)} onPayment={onPayment} compact />
        )}
      </section>
      <section className="panel pending-panel">
        <div className="panel-header"><div><h2>Needs attention</h2><p>Tenants with outstanding balance</p></div><button className="icon-button"><MoreHorizontal size={18} /></button></div>
        {pendingTenants.length === 0 ? (
          <div className="empty-state"><p>All rent collected!</p></div>
        ) : (
          <div className="pending-list">{pendingTenants.map((tenant) => {
            const room = appState.rooms.find(r => r.id === tenant.roomId)
            return <div className="pending-row" key={tenant.id}><Avatar initials={tenant.initials} /><div className="pending-person"><strong>{tenant.name}</strong><span>Room {room?.number}</span></div><div className="pending-amount"><strong>{formatCurrency(tenant.monthlyRent - tenant.paid)}</strong><span>due</span></div><button className="small-action" onClick={() => onPayment(tenant)}>Pay</button></div>
          })}</div>
        )}
      </section>
    </div>
  </>
}

function SummaryCard({ label, amount, icon: Icon, tone, note, action, suffix }: { label: string; amount: number; icon: typeof Check; tone: string; note: string; action?: () => void; suffix?: string }) {
  return <button className={`summary-card tone-${tone}`} onClick={action} disabled={!action}><div className="summary-top"><span>{label}</span><span className="summary-icon"><Icon size={16} /></span></div><div className="summary-amount">{typeof amount === 'number' && label !== 'Occupancy' ? formatCurrency(amount) : amount}{suffix && <small>{suffix}</small>}</div><p>{note}</p>{action && <ArrowUpRight className="summary-arrow" size={17} />}</button>
}

function RentTable({ appState, tenants: rows, onPayment, compact = false }: { appState: AppState; tenants: Tenant[]; onPayment: (tenant: Tenant) => void; compact?: boolean }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>Tenant</th><th>Room</th><th>Rent</th><th>Paid</th><th>Due</th><th>Status</th><th aria-label="Action" /></tr></thead><tbody>{rows.map((tenant) => {
    const room = appState.rooms.find(r => r.id === tenant.roomId)
    return <tr key={tenant.id}><td><div className="table-person"><Avatar initials={tenant.initials} /><strong>{tenant.name}</strong></div></td><td>{room?.number}</td><td>{formatCurrency(tenant.monthlyRent)}</td><td>{formatCurrency(tenant.paid)}</td><td className={tenant.paid < tenant.monthlyRent ? 'due-text' : ''}>{formatCurrency(tenant.monthlyRent - tenant.paid)}</td><td><StatusBadge status={tenant.status} /></td><td><button className={tenant.status === 'Paid' ? 'row-action muted-action' : 'row-action'} onClick={() => tenant.status !== 'Paid' && onPayment(tenant)}>{tenant.status === 'Paid' ? 'View' : 'Pay'}</button></td></tr>
  })}</tbody></table></div>
}

function Toolbar({ query, setQuery, actionLabel }: { query: string; setQuery: (value: string) => void; actionLabel?: string }) { return <div className="toolbar"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tenant or room" aria-label="Search tenant or room" /></label><button className="filter-button"><Filter size={16} /> <span>Filter</span></button>{actionLabel && <button className="button button-primary"><Plus size={17} /> {actionLabel}</button>}</div> }

function RentPage({ appState, tenants: rows, query, setQuery, onPayment, onEditRent }: { appState: AppState; tenants: Tenant[]; query: string; setQuery: (value: string) => void; onPayment: (tenant: Tenant) => void; onEditRent: (tenant: Tenant) => void }) { 
  return <>
    <PageHeader title="Rent" subtitle="Track monthly rent collection" />
    <div className="panel page-panel">
      <div className="rent-toolbar">
        <button className="select-button"><CalendarDays size={16} /> September 2026 <ChevronDown size={15} /></button>
        <Toolbar query={query} setQuery={setQuery} />
      </div>
      {appState.tenants.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 20px' }}><p>No tenants added yet.</p></div>
      ) : (
        <div className="rent-table-extended">
          <div className="table-scroll"><table className="data-table"><thead><tr><th>Tenant</th><th>Room</th><th>Rent</th><th>Paid</th><th>Due</th><th>Status</th><th aria-label="Actions" style={{ width: '120px' }} /></tr></thead><tbody>{rows.map((tenant) => {
            const room = appState.rooms.find(r => r.id === tenant.roomId)
            return <tr key={tenant.id}><td><div className="table-person"><Avatar initials={tenant.initials} /><strong>{tenant.name}</strong></div></td><td>{room?.number}</td><td>{formatCurrency(tenant.monthlyRent)}</td><td>{formatCurrency(tenant.paid)}</td><td className={tenant.paid < tenant.monthlyRent ? 'due-text' : ''}>{formatCurrency(tenant.monthlyRent - tenant.paid)}</td><td><StatusBadge status={tenant.status} /></td><td style={{ textAlign: 'right' }}><div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}><button className="row-action" onClick={() => onEditRent(tenant)} title="Edit rent">Edit rent</button><button className={tenant.status === 'Paid' ? 'row-action muted-action' : 'row-action'} onClick={() => tenant.status !== 'Paid' && onPayment(tenant)}>{tenant.status === 'Paid' ? 'View' : 'Pay'}</button></div></td></tr>
          })}</tbody></table></div>
        </div>
      )}
    </div>
  </> 
}

function TenantsPage({ appState, tenants: rows, query, setQuery, onPayment, onEditRent }: { appState: AppState; tenants: Tenant[]; query: string; setQuery: (value: string) => void; onPayment: (tenant: Tenant) => void; onEditRent: (tenant: Tenant) => void }) { 
  return <>
    <PageHeader title="Tenants" subtitle={`${rows.length} active tenants`} action={<button className="button button-primary"><Plus size={17} /> Add tenant</button>} />
    <div className="panel page-panel">
      <Toolbar query={query} setQuery={setQuery} />
      {appState.tenants.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 20px' }}><p>No tenants added yet.</p></div>
      ) : (
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Tenant</th><th>Room</th><th>Rent</th><th>Paid</th><th>Due</th><th>Status</th><th aria-label="Actions" style={{ width: '140px' }} /></tr></thead><tbody>{rows.map((tenant) => {
            const room = appState.rooms.find(r => r.id === tenant.roomId)
            return <tr key={tenant.id}><td><div className="table-person"><Avatar initials={tenant.initials} /><strong>{tenant.name}</strong></div></td><td>{room?.number}</td><td>{formatCurrency(tenant.monthlyRent)}</td><td>{formatCurrency(tenant.paid)}</td><td className={tenant.paid < tenant.monthlyRent ? 'due-text' : ''}>{formatCurrency(tenant.monthlyRent - tenant.paid)}</td><td><StatusBadge status={tenant.status} /></td><td style={{ textAlign: 'right' }}><div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}><button className="row-action" onClick={() => onEditRent(tenant)}>Edit rent</button><button className="row-action" onClick={() => onPayment(tenant)}>Pay</button></div></td></tr>
          })}</tbody></table></div>
      )}
    </div>
  </> 
}

function RoomsPage({ appState }: { appState: AppState }) { 
  return <>
    <PageHeader title="Rooms" subtitle={`${appState.tenants.filter(t => appState.rooms.find(r => r.id === t.roomId)?.occupied).length} of ${appState.rooms.length} rooms occupied`} action={<button className="button button-primary"><Plus size={17} /> Add room</button>} />
    {appState.rooms.length === 0 ? (
      <div className="panel page-panel" style={{ padding: '60px 20px', textAlign: 'center' }}><p>No rooms added yet.</p><button className="button button-secondary" style={{ marginTop: '16px' }}><Plus size={16} /> Add room</button></div>
    ) : (
      <div className="room-grid">{appState.rooms.map((room) => {
        const tenant = appState.tenants.find(t => t.roomId === room.id)
        const isOccupied = room.occupied && tenant
        return <div className={`room-card ${!isOccupied ? 'vacant-room' : ''}`} key={room.id}><div className="room-card-top"><span className="room-number">ROOM {room.number}</span><button className="icon-button"><MoreHorizontal size={18} /></button></div><div className="room-avatar">{!isOccupied ? <DoorOpen size={22} /> : <Avatar initials={tenant?.initials || ''} large />}</div><h3>{isOccupied ? tenant?.name : 'Vacant'}</h3><p>{isOccupied ? `${formatCurrency(room.rent)} / month` : 'Ready to assign'}</p><span className={`room-status ${!isOccupied ? 'room-vacant' : ''}`}><span className="status-dot" />{isOccupied ? 'Occupied' : 'Vacant'}</span></div>
      })}</div>
    )}
  </> 
}

function PaymentsPage() { return <><PageHeader title="Payments" subtitle="A complete history of recorded payments" action={<button className="button button-secondary"><Download size={16} /> Export</button>} /><div className="panel page-panel"><div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}><p>No payments recorded yet.</p></div></div></> }

function PendingPage({ pendingTenants, total, onPayment }: { pendingTenants: Tenant[]; total: number; onPayment: (tenant: Tenant) => void }) { 
  return <>
    <PageHeader title="Pending rent" subtitle="Follow up on outstanding balances" />
    <div className="pending-hero">
      <div>
        <span className="eyebrow">TOTAL OUTSTANDING</span>
        <strong>{formatCurrency(total)}</strong>
        <p>Across {pendingTenants.length} tenants this month</p>
      </div>
      <div className="pending-hero-icon"><CircleDollarSign size={28} /></div>
    </div>
    <section className="panel page-panel">
      <div className="panel-header"><div><h2>Tenants with pending rent</h2><p>Record a payment when you receive it</p></div></div>
      {pendingTenants.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}><p>All rent collected!</p></div>
      ) : (
        <div className="pending-page-list">{pendingTenants.map((tenant) => <div className="pending-page-row" key={tenant.id}><Avatar initials={tenant.initials} large /><div className="pending-person"><strong>{tenant.name}</strong><span>Room · Rent {formatCurrency(tenant.monthlyRent)}</span></div><div className="pending-breakdown"><span>Paid {formatCurrency(tenant.paid)}</span><strong>{formatCurrency(tenant.monthlyRent - tenant.paid)} due</strong></div><button className="button button-secondary" onClick={() => onPayment(tenant)}>Record payment</button></div>)}</div>
      )}
    </section>
  </> 
}

function ReportsPage({ expected, collected, pending }: { expected: number; collected: number; pending: number }) { 
  const bars = [54, 68, 61, 78, 70, 88, 81, 96, 86, 100, 91, 94]; 
  return <>
    <PageHeader title="Reports" subtitle="A simple view of your collection performance" action={<button className="select-button">2026 <ChevronDown size={15} /></button>} />
    <div className="report-summary">
      <div><span>Expected</span><strong>{formatCurrency(expected)}</strong><small>September 2026</small></div>
      <div><span>Collected</span><strong className="green-text">{formatCurrency(collected)}</strong><small>{expected > 0 ? `${Math.round((collected / expected) * 100)}%` : '0%'} collection rate</small></div>
      <div><span>Pending</span><strong className="orange-text">{formatCurrency(pending)}</strong><small>Needs follow-up</small></div>
    </div>
    <section className="panel chart-panel">
      <div className="panel-header"><div><h2>Collection overview</h2><p>Expected vs collected rent across the year</p></div><button className="select-button">This year <ChevronDown size={15} /></button></div>
      <div className="chart"><div className="chart-y"><span>₹10k</span><span>₹5k</span><span>₹0</span></div><div className="chart-bars">{bars.map((height, index) => <div className="bar-group" key={index}><div className="bars"><span className="bar expected-bar" style={{ height: `${height}%` }} /><span className="bar collected-bar" style={{ height: `${Math.max(height - 12, 25)}%` }} /></div><small>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]}</small></div>)}</div></div>
      <div className="chart-legend"><span><i className="legend-dot expected-dot" />Expected</span><span><i className="legend-dot collected-dot" />Collected</span></div>
    </section>
  </> 
}

function PaymentModal({ mode, appState, selectedTenant, activeTenants, currentMonth, onClose, onSave }: { mode: 'global' | 'tenant'; appState: AppState; selectedTenant: Tenant | null; activeTenants: Tenant[]; currentMonth: string; onClose: () => void; onSave: () => void }) {
  const [tenantId, setTenantId] = useState<number | null>(selectedTenant?.id || null)
  const tenant = tenantId ? activeTenants.find(t => t.id === tenantId) : selectedTenant

  if (!tenant) return null

  const room = appState.rooms.find(r => r.id === tenant.roomId)
  const remaining = tenant.monthlyRent - tenant.paid

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title">
      <div className="modal-header">
        <div>
          <h2 id="payment-title">Record payment</h2>
          <p>Add a rent payment for this month</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button>
      </div>

      {mode === 'global' && (
        <div className="form-grid" style={{ marginBottom: '20px' }}>
          <label style={{ gridColumn: '1 / -1' }}>Tenant
            <select value={tenantId || ''} onChange={(e) => setTenantId(parseInt(e.target.value))} aria-label="Select tenant">
              <option value="">Select tenant</option>
              {activeTenants.map((t) => {
                const r = appState.rooms.find(rm => rm.id === t.roomId)
                return <option key={t.id} value={t.id}>{t.name} — Room {r?.number}</option>
              })}
            </select>
          </label>
        </div>
      )}

      {tenant && (
        <>
          <div className="modal-tenant">
            <Avatar initials={tenant.initials} large />
            <div>
              <strong>{tenant.name}</strong>
              <span>Room {room?.number}</span>
            </div>
            <StatusBadge status={tenant.status} />
          </div>

          <div className="payment-breakdown">
            <div><span>Monthly rent</span><strong>{formatCurrency(tenant.monthlyRent)}</strong></div>
            <div><span>Already paid</span><strong>{formatCurrency(tenant.paid)}</strong></div>
            <div><span>Remaining</span><strong className="orange-text">{formatCurrency(remaining)}</strong></div>
          </div>

          <div className="form-grid">
            <label>Month<select defaultValue={currentMonth}><option>{currentMonth}</option></select></label>
            <label>Payment Method<select defaultValue="UPI"><option>UPI</option><option>Cash</option><option>Bank transfer</option></select></label>
            <label>Amount received<div className="input-prefix"><span>₹</span><input defaultValue={remaining.toLocaleString('en-IN')} inputMode="numeric" /></div></label>
            <label>Date<input type="date" defaultValue="2026-09-22" /></label>
            <label style={{ gridColumn: '1 / -1' }}>Reference (optional)<input placeholder="UPI ref, check #, etc." /></label>
            <label style={{ gridColumn: '1 / -1' }}>Notes (optional)<input placeholder="Any notes..." /></label>
          </div>

          <button className="full-paid-button" onClick={onSave}><Check size={17} /> Mark full rent paid · {formatCurrency(remaining)}</button>
          <button className="button button-primary modal-save" onClick={onSave}>Record payment</button>
        </>
      )}
    </div>
  </div>
}

function EditRentModal({ tenant, appState, onClose, onSave }: { tenant: Tenant; appState: AppState; onClose: () => void; onSave: () => void }) {
  const room = appState.rooms.find(r => r.id === tenant.roomId)
  const [newRent, setNewRent] = useState(tenant.monthlyRent.toString())
  const [effectiveFrom, setEffectiveFrom] = useState('October 2026')
  const [reason, setReason] = useState('')

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="edit-rent-title">
      <div className="modal-header">
        <div>
          <h2 id="edit-rent-title">Edit rent</h2>
          <p>Update {tenant.name}&apos;s monthly rent</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button>
      </div>

      <div className="modal-tenant">
        <Avatar initials={tenant.initials} large />
        <div>
          <strong>{tenant.name}</strong>
          <span>Room {room?.number}</span>
        </div>
      </div>

      <div className="payment-breakdown">
        <div><span>Current Rent</span><strong>{formatCurrency(tenant.monthlyRent)}</strong></div>
        <div><span>New Rent</span><strong>{formatCurrency(parseInt(newRent) || 0)}</strong></div>
        <div style={{ gridColumn: '1 / -1' }} />
      </div>

      <div className="form-grid">
        <label style={{ gridColumn: '1 / -1' }}>New Rent
          <div className="input-prefix"><span>₹</span><input type="number" value={newRent} onChange={(e) => setNewRent(e.target.value)} /></div>
        </label>
        <label style={{ gridColumn: '1 / -1' }}>Effective From
          <select value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)}>
            <option>October 2026</option>
            <option>November 2026</option>
            <option>December 2026</option>
          </select>
        </label>
        <label style={{ gridColumn: '1 / -1' }}>Reason (optional)
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Annual increase, maintenance costs" />
        </label>
      </div>

      <div className="rent-history-info">
        <h4>Rent History</h4>
        {tenant.rentHistory.map((entry, idx) => (
          <div key={idx}><span>{entry.fromMonth}</span><strong>{formatCurrency(entry.rent)}</strong></div>
        ))}
      </div>

      <button className="button button-primary modal-save" onClick={onSave}>Save Rent Change</button>
    </div>
  </div>
}
