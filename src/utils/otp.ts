import axios from 'axios';

export const generateOTP = (): string => Math.floor(100000 + Math.random() * 900000).toString();

export const sendOTP = async (phone: string, otp: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await axios.post(
      'https://control.msg91.com/api/v5/flow/',
      {
        template_id: process.env.MSG91_TEMPLATE_ID,
        sender: process.env.MSG91_SENDER_ID || "BAFNAR",
        mobiles: `91${phone}`,
        OTP: otp
      },
      {
        headers: {
          'authkey': process.env.MSG91_AUTHKEY,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('📱 MSG91:', response.data);
    return { success: true };
  } catch (error: any) {
    console.error('MSG91 Error:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔑 DEV OTP for +91${phone}: ${otp}`);
      return { success: true };
    }
    return { success: false, error: error.message };
  }
};
