import { connectPostgres } from '../db/prisma';

const connectDB = async (): Promise<void> => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  try {
    await connectPostgres();
  } catch (error: any) {
    console.error(`❌ PostgreSQL Error: ${error.message}`);
    throw error;
  }
};

export default connectDB;
