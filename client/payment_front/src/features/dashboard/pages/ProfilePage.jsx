import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User, Lock, MapPin, Plus, Trash2, Edit2, Phone, Mail } from 'lucide-react'
import Button from '../../../shared/components/ui/Button.jsx'
import Card from '../../../shared/components/ui/Card.jsx'
import { useAuth } from '../../../shared/context'
import { updateProfile, getAddresses, addAddress, updateAddress, deleteAddress } from '../../../shared/utils/authApi.js'

function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [addresses, setAddresses] = useState([])
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [deletingAddress, setDeletingAddress] = useState(null)
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    isDefault: false,
  })

  useEffect(() => {
    async function load() {
      try {
        const addrResp = await getAddresses()
        setAddresses(addrResp.data || [])
      } catch {
        // ignore
      }
    }
    load()
  }, [])

useEffect(() => {
  if (user) {
    const id = setTimeout(() => {
      setName(user.name || '')
      setEmail(user.email || '')
    }, 0)
    return () => clearTimeout(id)
  }
}, [user])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setMessage('')
    setSaving(true)
    try {
      const response = await updateProfile({ name, email })
      if (response?.data) {
        updateUser((prev) => ({ ...prev, name: response.data.name, email: response.data.email }))
        setMessage('Profile updated successfully.')
      }
    } catch (err) {
      setMessage(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const openAddressForm = () => {
    setAddressForm({
      fullName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      isDefault: false,
    })
    setEditingAddress(null)
    setShowAddressForm(true)
  }

  const closeAddressForm = () => {
    setAddressForm({
      fullName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      isDefault: false,
    })
    setEditingAddress(null)
    setShowAddressForm(false)
  }

  const handleAddressSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingAddress) {
        await updateAddress(editingAddress, addressForm)
      } else {
        await addAddress(addressForm)
      }
      const resp = await getAddresses()
      setAddresses(resp.data || [])
      closeAddressForm()
    } catch (err) {
      setMessage(err.message || 'Failed to save address.')
    }
  }

  const handleEditAddress = (address) => {
    setAddressForm({
      fullName: address.fullName,
      email: address.email,
      phone: address.phone,
      address: address.address,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      isDefault: address.isDefault,
    })
    setEditingAddress(address._id)
    setShowAddressForm(true)
  }

  const handleDeleteAddress = async (addressId) => {
    try {
      await deleteAddress(addressId)
      const resp = await getAddresses()
      setAddresses(resp.data || [])
      setDeletingAddress(null)
    } catch (err) {
      setMessage(err.message || 'Failed to delete address.')
    }
  }

  const formatAddress = (addr) => (
    <div className="text-sm text-slate-600 space-y-1">
      <p className="font-medium text-slate-900">{addr.fullName}</p>
      <p>{addr.address}</p>
      <p>{addr.city}, {addr.state} {addr.zipCode}</p>
      <p className="flex items-center gap-1">
        <Phone className="w-3 h-3" /> {addr.phone}
      </p>
      <p className="flex items-center gap-1">
        <Mail className="w-3 h-3" /> {addr.email}
      </p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-secondary mb-8">Profile</h1>

      <Card className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-secondary">Personal Information</p>
            <p className="text-sm text-slate-500">Update your profile details.</p>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-blue-50 text-primary text-sm rounded-lg">{message}</div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button type="submit" loading={saving}>Save Changes</Button>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-secondary">Delivery Addresses</p>
              <p className="text-sm text-slate-500">
                {addresses.length}/5 addresses saved
              </p>
            </div>
          </div>
          {!showAddressForm && addresses.length < 5 && (
            <Button variant="outline" size="sm" onClick={() => openAddressForm()}>
              <Plus className="w-4 h-4 mr-1" /> Add Address
            </Button>
          )}
        </div>

        {showAddressForm && (
          <form onSubmit={handleAddressSubmit} className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
            <h4 className="font-semibold text-slate-900">
              {editingAddress ? 'Edit Address' : 'New Address'}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input type="text" value={addressForm.fullName} onChange={(e) => setAddressForm((p) => ({ ...p, fullName: e.target.value }))} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={addressForm.email} onChange={(e) => setAddressForm((p) => ({ ...p, email: e.target.value }))} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="tel" value={addressForm.phone} onChange={(e) => setAddressForm((p) => ({ ...p, phone: e.target.value }))} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <input type="text" value={addressForm.address} onChange={(e) => setAddressForm((p) => ({ ...p, address: e.target.value }))} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input type="text" value={addressForm.city} onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <input type="text" value={addressForm.state} onChange={(e) => setAddressForm((p) => ({ ...p, state: e.target.value }))} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ZIP Code</label>
                <input type="text" value={addressForm.zipCode} onChange={(e) => setAddressForm((p) => ({ ...p, zipCode: e.target.value }))} required className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={addressForm.isDefault} onChange={(e) => setAddressForm((p) => ({ ...p, isDefault: e.target.checked }))} className="rounded" />
                Set as default
              </label>
              <Button type="submit" variant="primary" size="sm">Save</Button>
               <Button type="button" variant="outline" size="sm" onClick={closeAddressForm}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {addresses.length === 0 && !showAddressForm && (
            <p className="text-sm text-slate-400 text-center py-4">No addresses saved yet. Add one to speed up checkout.</p>
          )}
          {addresses.map((addr) => (
            <div key={addr._id} className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg">
              <div className="flex-1">
                {formatAddress(addr)}
                {addr.isDefault && (
                  <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Default</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEditAddress(addr)} className="p-1 text-slate-400 hover:text-primary transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                {addresses.length > 1 && (
                  <button onClick={() => setDeletingAddress(addr._id)} className="p-1 text-slate-400 hover:text-danger transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {deletingAddress && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-red-700">Delete this address?</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeletingAddress(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => handleDeleteAddress(deletingAddress)}>Delete</Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-secondary">Security</p>
            <p className="text-sm text-slate-500">Change your password.</p>
          </div>
        </div>
        <Link to="/forgot-password">
          <Button variant="outline">Change Password</Button>
        </Link>
      </Card>
    </div>
  )
}

export default ProfilePage