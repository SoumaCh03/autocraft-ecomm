import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import './index.css'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <App />

              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: '#0e1422',
                    color: '#e8eaf0',
                    border: '1px solid #1a2236',
                    borderRadius: '12px',
                  },
                  success: {
                    iconTheme: {
                      primary: '#3b6bff',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)