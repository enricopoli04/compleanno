import mongoose, { Document, Schema, Types } from 'mongoose';
import { User } from './User.js';

export interface ICar extends Document {
  driver: Types.ObjectId;
  seats: number;
  passengers: Types.ObjectId[];
}

const carSchema = new Schema<ICar>(
  {
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
  },
  { timestamps: true, autoIndex: false }
);

export const Car = mongoose.model<ICar>('Car', carSchema);

const POPULATE = [
  { path: 'driver', select: 'username' },
  { path: 'passengers', select: 'username' },
];

interface PopulatedCar {
  _id: Types.ObjectId;
  seats: number;
  createdAt: Date;
  driver: { username: string } | null;
  passengers: { username: string }[];
}

function carView(car: PopulatedCar) {
  return {
    _id: car._id,
    seats: car.seats,
    createdAt: car.createdAt,
    driverUsername: car.driver?.username ?? '',
    passengers: car.passengers.map((p) => p.username),
  };
}

export async function findCarViews() {
  const cars = await Car.find().sort({ createdAt: 1 }).populate(POPULATE);
  return cars.map((c) => carView(c as unknown as PopulatedCar));
}

export async function carViewOf(car: ICar) {
  await car.populate(POPULATE);
  return carView(car as unknown as PopulatedCar);
}

export async function migrateCars() {
  const legacy = await Car.collection
    .find({ driver: { $exists: false }, driverUsername: { $exists: true } })
    .toArray();

  for (const car of legacy) {
    const names: string[] = [car.driverUsername, ...(car.passengers ?? [])];
    const users = await User.find({ username: { $in: names } }).select('_id username');
    const idByName = new Map(users.map((u) => [u.username, u._id]));

    const driver = idByName.get(car.driverUsername);
    if (!driver) {
      await Car.collection.deleteOne({ _id: car._id });
      continue;
    }
    const passengers = (car.passengers ?? [])
      .map((name: string) => idByName.get(name))
      .filter(Boolean);

    await Car.collection.updateOne(
      { _id: car._id },
      { $set: { driver, passengers }, $unset: { driverUsername: '' } }
    );
  }

  await Car.syncIndexes();
  if (legacy.length > 0) console.log(`✓ Migrate ${legacy.length} auto al formato con _id`);
}
