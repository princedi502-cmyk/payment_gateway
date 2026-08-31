import { useState, useEffect } from 'react'
import Button from '../../../shared/components/ui/Button.jsx'
import { MapPin, Plus, Edit2, Check, User as UserIcon } from 'lucide-react'
import { getCurrentUser, getAddresses, addAddress, updateAddress } from '../../../shared/utils/authApi.js'

function CheckoutDetailsForm({ onCreateSession }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [useContactInfo, setUseContactInfo] = useState(false)
  const [contactData, setContactData] = useState({
    fullName: '',
    email: '',
    phone: '',
  })
  const [contactErrors, setContactErrors] = useState({})

  const loadAddressIntoForm = (address) => {
    setFormData({
      fullName: address.fullName || '',
      email: address.email || '',
      phone: address.phone || '',
      address: address.address || '',
      city: address.city || '',
      state: address.state || '',
      zipCode: address.zipCode || '',
    })
  }

  useEffect(() => {
    async function load() {
      try {
        await getCurrentUser()
        const addrResp = await getAddresses()
        setSavedAddresses(addrResp.data || [])
        const defaultAddr = addrResp.data?.find((a) => a.isDefault) || addrResp.data?.[0]
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr._id)
          loadAddressIntoForm(defaultAddr)
        }
      } catch {
        // ignore
      }
    }
    load()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleContactChange = (e) => {
    const { name, value } = e.target
    setContactData((prev) => ({ ...prev, [name]: value }))
    if (contactErrors[name]) {
      setContactErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }



  const clearForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
    })
  }

  const handleEditAddress = (address) => {
    setEditingAddressId(address._id)
    loadAddressIntoForm(address)
    setShowAddressForm(true)
  }

  const handleSelectAddress = (addressId) => {
    setSelectedAddressId(addressId)
    const addr = savedAddresses.find((a) => a._id === addressId)
    if (addr) {
      loadAddressIntoForm(addr)
    }
  }

  const handleCancelForm = () => {
    setShowAddressForm(false)
    setEditingAddressId(null)
    clearForm()
  }

  const handleSaveAddress = async (e) => {
    e.preventDefault()
    try {
      if (editingAddressId) {
        await updateAddress(editingAddressId, formData)
      } else {
        await addAddress({ ...formData, isDefault: savedAddresses.length === 0 })
      }
      const resp = await getAddresses()
      setSavedAddresses(resp.data || [])
      setShowAddressForm(false)
      setEditingAddressId(null)
      clearForm()
    } catch (err) {
      setCheckoutError(err.message || 'Failed to save address.')
    }
  }

  const validate = () => {
    const nextErrors = {}
    if (!formData.fullName.trim()) nextErrors.fullName = 'Full name is required'
    if (!formData.email.trim()) nextErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) nextErrors.email = 'Invalid email'
    if (!formData.phone.trim()) nextErrors.phone = 'Phone number is required'
    if (!formData.address.trim()) nextErrors.address = 'Address is required'
    if (!formData.city.trim()) nextErrors.city = 'City is required'
    if (!formData.state.trim()) nextErrors.state = 'State is required'
    if (!formData.zipCode.trim()) nextErrors.zipCode = 'ZIP code is required'

    setErrors(nextErrors)

    const nextContactErrors = {}
    if (useContactInfo) {
      if (!contactData.fullName.trim()) nextContactErrors.fullName = 'Full name is required'
      if (!contactData.email.trim()) nextContactErrors.email = 'Email is required'
      else if (!/\S+@\S+\.\S+/.test(contactData.email)) nextContactErrors.email = 'Invalid email'
      if (!contactData.phone.trim()) nextContactErrors.phone = 'Phone number is required'
    }
    setContactErrors(nextContactErrors)

    return Object.keys(nextErrors).length === 0 && Object.keys(nextContactErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setCheckoutError('')

    try {
      const submitData = {
        items: [],
        shippingAddress: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
        selectedAddressId: selectedAddressId || undefined,
      }

      if (useContactInfo) {
        submitData.contactInfo = {
          fullName: contactData.fullName,
          email: contactData.email,
          phone: contactData.phone,
        }
      }

      await onCreateSession(submitData)
    } catch (error) {
      setCheckoutError(error.message || 'Failed to initialize payment.')
      setSubmitting(false)
    }
  }

  const selectedAddress = savedAddresses.find((a) => a._id === selectedAddressId)

  const isFormOpen = showAddressForm

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Delivery Address
        </h3>

        {/* Show all saved addresses as selectable cards */}
        {savedAddresses.length > 0 && !isFormOpen && (
          <div className="space-y-2">
            {savedAddresses.map((addr) => (
              <div
                key={addr._id}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedAddressId === addr._id
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => handleSelectAddress(addr._id)}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900 text-sm">{addr.fullName}</p>
                    {selectedAddressId === addr._id && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{addr.address}, {addr.city}, {addr.state} {addr.zipCode}</p>
                  <p className="text-xs text-slate-400">{addr.phone}</p>
                  {addr.isDefault && (
                    <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Default</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleEditAddress(addr) }}
                  className="p-1 text-slate-400 hover:text-primary transition-colors shrink-0"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Address form (add or edit) */}
        {isFormOpen && (
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
            <h4 className="font-semibold text-slate-900">
              {editingAddressId ? 'Edit Address' : 'Add New Address'}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address}</p>}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input type="text" name="city" value={formData.city} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <input type="text" name="state" value={formData.state} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {errors.state && <p className="text-xs text-red-600 mt-1">{errors.state}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ZIP Code</label>
                <input type="text" name="zipCode" value={formData.zipCode} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {errors.zipCode && <p className="text-xs text-red-600 mt-1">{errors.zipCode}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="primary" size="sm" onClick={handleSaveAddress}>{editingAddressId ? 'Update Address' : 'Save Address'}</Button>
              <Button type="button" variant="outline" size="sm" onClick={handleCancelForm}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isFormOpen && (
          <div className="flex flex-wrap gap-3">
            {savedAddresses.length > 0 && (
              <Button variant="outline" size="sm" type="button" onClick={() => {
                if (selectedAddress) {
                  loadAddressIntoForm(selectedAddress)
                }
                setShowAddressForm(true)
              }}>
                <Edit2 className="w-4 h-4 mr-1" /> Change Address
              </Button>
            )}
            <Button variant="outline" size="sm" type="button" onClick={() => {
              clearForm()
              setShowAddressForm(true)
            }}>
              <Plus className="w-4 h-4 mr-1" /> Add Address
            </Button>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 pt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useContactInfo}
            onChange={(e) => setUseContactInfo(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-slate-700">Order for someone else</span>
        </label>

        {useContactInfo && (
          <div className="mt-4 p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Contact Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input type="text" name="fullName" value={contactData.fullName} onChange={handleContactChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {contactErrors.fullName && <p className="text-xs text-red-600 mt-1">{contactErrors.fullName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" name="email" value={contactData.email} onChange={handleContactChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {contactErrors.email && <p className="text-xs text-red-600 mt-1">{contactErrors.email}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="tel" name="phone" value={contactData.phone} onChange={handleContactChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              {contactErrors.phone && <p className="text-xs text-red-600 mt-1">{contactErrors.phone}</p>}
            </div>
          </div>
        )}
      </div>

      {checkoutError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{checkoutError}</div>}

      <Button type="submit" variant="primary" size="lg" className="w-full" loading={submitting}>
        Continue to Payment
      </Button>
    </form>
  )
}

export default CheckoutDetailsForm