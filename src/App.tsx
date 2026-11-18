import { Dashboard } from './components/Dashboard.tsx'
import { loadBackerSeries, loadDataset, routeFromDocument } from './load.ts'

export function App() {
  const route = routeFromDocument()
  return (
    <Dashboard
      dataset={loadDataset(route)}
      route={route}
      now={new Date()}
      backers={loadBackerSeries(route)}
    />
  )
}
