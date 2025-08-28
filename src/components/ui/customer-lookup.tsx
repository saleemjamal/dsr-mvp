"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { User, Phone, Mail, Plus, Search, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { searchCustomers, createCustomer, CustomerSearchResult, Customer } from "@/lib/customer-service"

interface CustomerLookupProps {
  onCustomerSelect: (customer: Customer | null) => void
  initialPhone?: string
  allowNewCustomer?: boolean
}

export function CustomerLookup({ onCustomerSelect, initialPhone = "", allowNewCustomer = true }: CustomerLookupProps) {
  const [phone, setPhone] = useState(initialPhone)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    email: ''
  })
  const justCreatedCustomer = useRef(false)

  useEffect(() => {
    if (initialPhone) {
      handleLookup(initialPhone)
    }
  }, [initialPhone])

  const handleLookup = async (searchPhone?: string) => {
    const lookupPhone = searchPhone || phone
    if (!lookupPhone.trim()) return

    console.log('Starting customer lookup for:', lookupPhone)
    setLoading(true)
    
    try {
      console.log('Calling searchCustomers with:', lookupPhone)
      const results = await searchCustomers(lookupPhone)
      console.log('Search results:', results)
      
      if (results.length > 0) {
        const foundCustomer: Customer = {
          id: results[0].id,
          customer_name: results[0].customer_name,
          phone: results[0].phone || '',
          email: results[0].email || ''
        }
        setCustomer(foundCustomer)
        setShowNewCustomerForm(false)
        onCustomerSelect(foundCustomer)
        toast.success("Customer found!")
      } else {
        setCustomer(null)
        if (allowNewCustomer) {
          setShowNewCustomerForm(true)
          toast.info("Customer not found. You can add them below.")
        } else {
          toast.error("Customer not found")
        }
        onCustomerSelect(null)
      }
    } catch (error) {
      console.error('Error in handleLookup:', error)
      toast.error(`Failed to lookup customer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      console.log('Setting loading to false')
      setLoading(false)
    }
  }

  const handleCreateCustomer = async (fromDialog = false) => {
    const customerData = fromDialog ? newCustomerData : { name: newCustomerData.name, phone: phone, email: newCustomerData.email }
    
    if (!customerData.name.trim()) {
      toast.error("Customer name is required")
      return
    }

    if (!customerData.phone.trim()) {
      toast.error("Customer phone is required")
      return
    }

    setLoading(true)
    
    try {
      const existingResults = await searchCustomers(customerData.phone)
      if (existingResults.length > 0) {
        toast.error("Customer with this phone number already exists")
        setLoading(false)
        return
      }
      
      const createdCustomer = await createCustomer({
        customer_name: customerData.name,
        phone: customerData.phone,
        email: customerData.email || undefined
      })
      
      const newCustomer: Customer = {
        id: createdCustomer.id!,
        customer_name: createdCustomer.customer_name,
        phone: createdCustomer.phone || '',
        email: createdCustomer.email || ''
      }
      
      setCustomer(newCustomer)
      setShowNewCustomerForm(false)
      setIsDialogOpen(false)
      
      if (fromDialog) {
        setPhone(customerData.phone)
      }
      
      // Set flag to indicate customer was just created
      justCreatedCustomer.current = true
      
      console.log('Customer created successfully, calling onCustomerSelect with:', newCustomer)
      
      // Notify parent component immediately
      onCustomerSelect(newCustomer)
      
      // Clear the flag after a short delay
      setTimeout(() => {
        justCreatedCustomer.current = false
        toast.success("Customer created successfully!")
      }, 200)
      
      setNewCustomerData({ name: '', phone: '', email: '' })
      
    } catch (error) {
      toast.error("Failed to create customer")
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneChange = (value: string) => {
    setPhone(value)
    if (customer && customer.phone !== value) {
      setCustomer(null)
      setShowNewCustomerForm(false)
      onCustomerSelect(null)
    }
  }

  const handleNewCustomerInputChange = (field: string, value: string) => {
    setNewCustomerData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-4">
      {/* Phone Lookup */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="customer_phone">Customer Phone Number *</Label>
          {allowNewCustomer && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setNewCustomerData({ name: '', phone: '', email: '' })
                  }}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Add New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                  <DialogDescription>
                    Create a new customer record
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  handleCreateCustomer(true)
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dialog_name">Full Name *</Label>
                    <Input
                      id="dialog_name"
                      placeholder="Customer full name"
                      value={newCustomerData.name}
                      onChange={(e) => setNewCustomerData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dialog_phone">Phone Number *</Label>
                    <Input
                      id="dialog_phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={newCustomerData.phone}
                      onChange={(e) => setNewCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dialog_email">Email Address</Label>
                    <Input
                      id="dialog_email"
                      type="email"
                      placeholder="customer@example.com"
                      value={newCustomerData.email}
                      onChange={(e) => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Creating..." : "Create Customer"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="customer_phone"
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onBlur={() => phone.trim() && handleLookup()}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            className="pl-10 pr-10"
            required
          />
          {loading && (
            <Search className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Enter phone number - customer lookup happens automatically when you tab out
        </p>
      </div>

      {/* Existing Customer Details */}
      {customer && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                <User className="h-4 w-4 text-green-600 dark:text-green-300" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-green-900 dark:text-green-100">{customer.customer_name}</p>
                <div className="flex items-center gap-4 text-sm text-green-700 dark:text-green-300">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {customer.phone}
                  </span>
                  {customer.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {customer.email}
                    </span>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCustomer(null)
                  setPhone("")
                  setShowNewCustomerForm(false)
                  onCustomerSelect(null)
                }}
              >
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Customer Form */}
      {showNewCustomerForm && allowNewCustomer && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Plus className="h-4 w-4 text-blue-600" />
                <p className="font-medium text-blue-900 dark:text-blue-100">Add New Customer</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new_customer_name">Full Name *</Label>
                  <Input
                    id="new_customer_name"
                    placeholder="Customer full name"
                    value={newCustomerData.name}
                    onChange={(e) => handleNewCustomerInputChange('name', e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new_customer_email">Email Address</Label>
                  <Input
                    id="new_customer_email"
                    type="email"
                    placeholder="customer@example.com"
                    value={newCustomerData.email}
                    onChange={(e) => handleNewCustomerInputChange('email', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowNewCustomerForm(false)
                    setNewCustomerData({ name: '', phone: '', email: '' })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleCreateCustomer(false)}
                  disabled={loading || !newCustomerData.name.trim()}
                >
                  {loading ? "Creating..." : "Create Customer"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}