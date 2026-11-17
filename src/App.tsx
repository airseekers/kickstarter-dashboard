import { Dashboard } from './components/Dashboard.tsx'
import { loadDataset, routeFromDocument } from './load.ts'

export function App() {
  const route = routeFromDocument()
  return <Dashboard dataset={loadDataset(route)} route={route} now={new Date()} />
}
