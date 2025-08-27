"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './auth-context'
import { getUserAccessibleStores, type Store } from '@/lib/store-service'
import { UserRole } from '@/lib/permissions'

interface StoreContextType {
  currentStore: Store | null
  accessibleStores: Store[]
  setCurrentStore: (store: Store | null) => void
  loading: boolean
  canAccessMultipleStores: boolean
  isAllStoresSelected: boolean
  setAllStoresSelected: (allStores: boolean) => void
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

interface StoreProviderProps {
  children: ReactNode
}

export function StoreProvider({ children }: StoreProviderProps) {
  const { profile } = useAuth()
  const [currentStore, setCurrentStore] = useState<Store | null>(null)
  const [accessibleStores, setAccessibleStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [isAllStoresSelected, setIsAllStoresSelected] = useState(false)

  // Check if user can access multiple stores
  const canAccessMultipleStores = profile?.role === UserRole.SUPER_USER || profile?.role === UserRole.ACCOUNTS_INCHARGE

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false)
      return
    }

    loadAccessibleStores()
  }, [profile?.id])

  const loadAccessibleStores = async () => {
    if (!profile?.id) return

    try {
      setLoading(true)
      const stores = await getUserAccessibleStores(profile.id)
      setAccessibleStores(stores)

      // Set current store and initial selection mode
      if (stores.length > 0) {
        // For multi-store users, default to "All Stores" mode
        if (canAccessMultipleStores) {
          setIsAllStoresSelected(true)
          setCurrentStore(null) // null represents "All Stores"
        } else {
          // Single store users: set their assigned store
          if (profile.default_store_id) {
            const defaultStore = stores.find(s => s.id === profile.default_store_id)
            if (defaultStore) {
              setCurrentStore(defaultStore)
            } else {
              setCurrentStore(stores[0])
            }
          } else {
            setCurrentStore(stores[0])
          }
          setIsAllStoresSelected(false)
        }
      }
    } catch (error) {
      console.error('Error loading accessible stores:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetCurrentStore = (store: Store | null) => {
    setCurrentStore(store)
    
    // Update All Stores selection state
    if (canAccessMultipleStores) {
      setIsAllStoresSelected(store === null)
    }
    
    // Save to localStorage for persistence
    if (store) {
      localStorage.setItem('current-store-id', store.id)
    } else {
      localStorage.removeItem('current-store-id')
    }
  }

  const handleSetAllStoresSelected = (allStores: boolean) => {
    if (canAccessMultipleStores) {
      setIsAllStoresSelected(allStores)
      if (allStores) {
        setCurrentStore(null)
        localStorage.removeItem('current-store-id')
      } else if (accessibleStores.length > 0) {
        // If switching from "All Stores" to specific store, select first available
        const firstStore = accessibleStores[0]
        setCurrentStore(firstStore)
        localStorage.setItem('current-store-id', firstStore.id)
      }
    }
  }

  // Load saved store from localStorage on mount
  useEffect(() => {
    if (accessibleStores.length > 0 && !currentStore && !isAllStoresSelected) {
      const savedStoreId = localStorage.getItem('current-store-id')
      if (savedStoreId) {
        const savedStore = accessibleStores.find(s => s.id === savedStoreId)
        if (savedStore) {
          setCurrentStore(savedStore)
          if (canAccessMultipleStores) {
            setIsAllStoresSelected(false)
          }
        }
      }
    }
  }, [accessibleStores, currentStore, isAllStoresSelected, canAccessMultipleStores])

  return (
    <StoreContext.Provider
      value={{
        currentStore,
        accessibleStores,
        setCurrentStore: handleSetCurrentStore,
        loading,
        canAccessMultipleStores,
        isAllStoresSelected,
        setAllStoresSelected: handleSetAllStoresSelected,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}