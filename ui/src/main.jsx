import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import FoodWasteDashboard from './FoodWasteDashboard'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FoodWasteDashboard />
  </StrictMode>
)