import { type Request, type Response, type NextFunction } from "express"
import mongoose from "mongoose"
import User from "../models/user.model.ts"
import type { IUserAddress } from "../models/user.model.ts"
import { BadRequestError, NotFoundError } from "../errors/AppError.ts"

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
      throw new NotFoundError("User")
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
    const { isDefault: clientIsDefault, ...addressData } = req.body as IUserAddress & { isDefault?: boolean }

    const user = await User.findById(userId)
    if (!user) {
      throw new NotFoundError("User")
    }

    if (user.addresses.length >= MAX_ADDRESSES) {
      throw new BadRequestError(`Maximum ${MAX_ADDRESSES} addresses allowed`)
    }

    const isFirst = user.addresses.length === 0
    const shouldBeDefault = isFirst || clientIsDefault === true

    if (shouldBeDefault) {
      user.addresses.forEach((a) => { a.isDefault = false })
    }

    const newAddress = {
      ...addressData,
      isDefault: shouldBeDefault,
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
    const addressId = req.params.addressId as string

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      throw new BadRequestError("Invalid address ID")
    }

    const updates = req.body as Partial<IUserAddress>
    const user = await User.findById(userId)
    if (!user) {
      throw new NotFoundError("User")
    }

    const index = user.addresses.findIndex((a: IUserAddress) => a._id?.toString() === addressId)
    if (index === -1) {
      throw new NotFoundError("Address")
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
    const addressId = req.params.addressId as string

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      throw new BadRequestError("Invalid address ID")
    }

    const user = await User.findById(userId)
    if (!user) {
      throw new NotFoundError("User")
    }

    const index = user.addresses.findIndex((a: IUserAddress) => a._id?.toString() === addressId)
    if (index === -1) {
      throw new NotFoundError("Address")
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