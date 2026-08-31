import { type Request, type Response, type NextFunction } from "express"
import  User from "../models/user.model.ts"
import type { IUserAddress } from "../models/user.model.ts"

const MAX_ADDRESSES = 5

export const getAddresses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId
    const user = await User.findById(userId).select("addresses")

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" })
      return
    }

    res.status(200).json({
      success: true,
      data: user.addresses,
    })
  } catch (error) {
    next(error)
  }
}

export const addAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId
    const addressData = req.body as Omit<IUserAddress, "isDefault">

    const user = await User.findById(userId)
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" })
      return
    }

    if (user.addresses.length >= MAX_ADDRESSES) {
      res.status(400).json({
        success: false,
        message: `Maximum ${MAX_ADDRESSES} addresses allowed`,
      })
      return
    }

    const newAddress = {
      ...addressData,
      isDefault: user.addresses.length === 0,
    }

    user.addresses.push(newAddress as IUserAddress)
    await user.save()

    res.status(201).json({
      success: true,
      data: user.addresses,
    })
  } catch (error) {
    next(error)
  }
}

export const updateAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId
    const { addressId } = req.params
    const updates = req.body as Partial<IUserAddress>

    const user = await User.findById(userId)
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" })
      return
    }

    const index = user.addresses.findIndex((a: IUserAddress) => a._id?.toString() === addressId)
    if (index === -1) {
      res.status(404).json({ success: false, message: "Address not found" })
      return
    }

    user.addresses[index] = { ...user.addresses[index], ...updates } as IUserAddress

    if (updates.isDefault === true) {
      user.addresses.forEach((a: IUserAddress, i: number) => {
        if (i !== index) a.isDefault = false
      })
    }

    await user.save()

    res.status(200).json({
      success: true,
      data: user.addresses,
    })
  } catch (error) {
    next(error)
  }
}

export const deleteAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId
    const { addressId } = req.params

    const user = await User.findById(userId)
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" })
      return
    }

    const index = user.addresses.findIndex((a: IUserAddress) => a._id?.toString() === addressId)
    if (index === -1) {
      res.status(404).json({ success: false, message: "Address not found" })
      return
    }

   const wasDefault = user.addresses[index]?.isDefault ?? false
    user.addresses.splice(index, 1)

    if (wasDefault && user.addresses.length > 0) {
     user.addresses[0]!.isDefault = true
    }

    await user.save()

    res.status(200).json({
      success: true,
      data: user.addresses,
    })
  } catch (error) {
    next(error)
  }
}
