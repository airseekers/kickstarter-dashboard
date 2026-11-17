import { Dashboard } from './components/Dashboard.tsx'
import { loadDataset } from './load.ts'

export function App() {
  return <Dashboard dataset={loadDataset()} now={new Date()} />
}
