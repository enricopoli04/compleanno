import mongoose, { Document, Schema } from 'mongoose';

export interface ICar extends Document {
  driverUsername: string;
  seats: number;
  passengers: string[];
}

const carSchema = new Schema<ICar>(
  {
    driverUsername: {
      type: String,
      required: true,
      unique: true,
    },
    seats: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
    },
    passengers: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export const Car = mongoose.model<ICar>('Car', carSchema);
