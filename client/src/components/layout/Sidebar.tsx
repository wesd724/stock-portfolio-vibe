import UserInfo from '../user/UserInfo'

export default function Sidebar() {
  return (
    <aside style={{
      position: 'fixed',
      top: '60px',
      left: 0,
      bottom: 0,
      width: '220px',
      background: '#0f172a',
      borderRight: '1px solid #1e293b',
      overflowY: 'auto',
    }}>
      <UserInfo />
    </aside>
  )
}
