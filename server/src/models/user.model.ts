import mongoose, { Schema, model, Document } from "mongoose"

export interface IUserAddress {
  _id?: mongoose.Types.ObjectId
  fullName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  isDefault: boolean
}

export interface IUser extends Document {
  email: string
  password?: string
  name: string
  provider: "local" | "google"
  googleId?: string
  isVerified: boolean
  role: "user" | "admin"
  verificationToken: string
  verificationTokenExpires: Date
resetPasswordToken?: string | undefined
resetPasswordExpires?: Date | undefined
  addresses: IUserAddress[]
  failedLoginAttempts: number
  lockUntil: Date | null
}

const userAddressSchema = new Schema<IUserAddress>({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  zipCode: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
})

const userSchema = new Schema<IUser>(
  {
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    password: { type: String, required: false },
    name: { type: String, required: true, trim: true },
    provider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String, unique: true, sparse: true },
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    verificationToken: { type: String, index: true },
    verificationTokenExpires: { type: Date },
    resetPasswordToken: { type: String, index: true },
    resetPasswordExpires: { type: Date },
    addresses: { type: [userAddressSchema], default: [] },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  },
  { timestamps: true }
)

userSchema.pre("save", function () {
  if (this.addresses.length > 0 && !this.addresses.some((a) => a.isDefault)) {
    this.addresses[0]!.isDefault = true
  }
})

const User = model<IUser>("User", userSchema)

export default User
